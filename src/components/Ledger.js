// src/components/Ledger.js
// FINAL VERSION - Includes apiName definition and Pagination

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { get, post } from 'aws-amplify/api';
import {
  Box, Heading, Text, Button, Container, Table, Thead, Tbody, Tr, Th, Td,
  TableContainer, Alert, AlertIcon, VStack, FormControl, FormLabel, Input,
  Textarea, HStack, SimpleGrid, Divider, Select, IconButton, Tag, Flex,
  useToast, Spinner, InputGroup, InputLeftAddon, ButtonGroup, Stat, StatLabel, StatNumber, StatHelpText, StatGroup,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, useDisclosure
} from '@chakra-ui/react';
// import { AddIcon, DeleteIcon } from '@chakra-ui/icons';

// --- Constants ---
const LEDGER_PATH = '/ledger';
const DEFAULT_STATUS_MSG = "Select date range and filter type.";
const EMPTY_MANUAL_FORM = { entryType: 'EXPENSE', entryDate: new Date().toISOString().split('T')[0], description: '', amount: '' };

// --- Main Ledger Component ---
function Ledger() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isOpen: isModalOpen, onOpen: openModal, onClose: closeModal } = useDisclosure();

  // State
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState(DEFAULT_STATUS_MSG);
  const [messageType, setMessageType] = useState('info');
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [lastEvaluatedKey, setLastEvaluatedKey] = useState(null);

  // Filter State
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
  const [filterType, setFilterType] = useState('ALL');
  const [startDate, setStartDate] = useState(searchParams.get('startDate') || firstDayOfMonth);
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || lastDayOfMonth);
  const [filterCustomerId, setFilterCustomerId] = useState(searchParams.get('customerId') || '');

  // Manual Entry Form State
  const [manualEntry, setManualEntry] = useState({...EMPTY_MANUAL_FORM});

  // --- ADD apiName Constant ---
  const apiName = 'inventoryApi'; // Use the name defined in your aws-exports.js
  // --------------------------

  // --- Fetch Ledger Entries ---
  const fetchLedgerEntries = useCallback(async (fetchParams, loadMore = false) => {
    console.log(`Ledger: Fetching entries. Load More: ${loadMore}, Params:`, fetchParams);
    if (loadMore) { setIsLoadingMore(true); }
    else { setIsLoading(true); setEntries([]); setLastEvaluatedKey(null); } // Reset list/key for new filter/initial load
    setError(null); if (!loadMore) { setStatusMessage("Loading entries..."); setMessageType('info'); }

    try {
        const queryParams = {};
        if (fetchParams.startDate) queryParams.startDate = fetchParams.startDate;
        if (fetchParams.endDate) queryParams.endDate = fetchParams.endDate;
        if (fetchParams.filterType && fetchParams.filterType !== 'ALL') queryParams.entryType = fetchParams.filterType;
        if (fetchParams.filterCustomerId) queryParams.customerId = fetchParams.filterCustomerId;
        if (loadMore && fetchParams.startKey) { queryParams.exclusiveStartKey = fetchParams.startKey; }

        // Validation
        if (!queryParams.startDate || !queryParams.endDate) { throw new Error("Date range required."); }
        // Backend handles requirement of type OR customer OR scan fallback

        console.log(`Ledger: GET ${apiName}${LEDGER_PATH} query:`, queryParams);
        const operation = get({ apiName: apiName, path: LEDGER_PATH, options: { queryParams } }); // Use apiName
        const response = await operation.response;
        console.log(`Ledger: GET ${LEDGER_PATH} status: ${response.statusCode}`);

        if (response.statusCode >= 200 && response.statusCode < 300 && response.body) {
            const fetchedData = await response.body.json();
            if (!fetchedData || !Array.isArray(fetchedData.items)) throw new Error('Ledger API response format invalid');
            console.log(`Ledger: Fetched ${fetchedData.items.length} new entries.`); console.log("Ledger: Received lastEvaluatedKey:", fetchedData.lastEvaluatedKey);
            setEntries(prevEntries => loadMore ? [...prevEntries, ...fetchedData.items] : [...fetchedData.items]);
            setLastEvaluatedKey(fetchedData.lastEvaluatedKey || null);
            if (!loadMore) { setStatusMessage(fetchedData.items.length === 0 ? "No entries match criteria." : null); if(fetchedData.items.length > 0) setMessageType('info'); }
        } else { let eMsg=`GET fail: ${response.statusCode}`; try{const b=await response.body.json(); eMsg+=` ${b?.error||b?.message||''}`}catch(e){} throw new Error(eMsg); }
    } catch (err) { console.error("Ledger: Error fetchLedgerEntries:", err); setError(err.message || 'Failed load ledger entries.'); if (!loadMore) setEntries([]); setStatusMessage(null); }
    finally { if (loadMore) setIsLoadingMore(false); else setIsLoading(false); console.log("Ledger: fetchLedgerEntries finished."); }
  }, [apiName]); // Include apiName (though stable)

  // --- Effect to Fetch Data on Filter Change ---
  useEffect(() => {
      const paramsToFetch = { startDate, endDate, filterType, filterCustomerId };
      const currentParams = {}; if(startDate) currentParams.startDate=startDate; if(endDate) currentParams.endDate=endDate; if(filterType !== 'ALL') currentParams.filterType=filterType; if(filterCustomerId) currentParams.customerId=filterCustomerId;
      setSearchParams(currentParams, { replace: true });
      fetchLedgerEntries(paramsToFetch, false); // False = Not loading more
  }, [startDate, endDate, filterType, filterCustomerId, fetchLedgerEntries, setSearchParams]); // Refetch on filter change

  // --- Load More Handler ---
  const handleLoadMore = () => {
      if (!lastEvaluatedKey || isLoading || isLoadingMore) return;
      console.log("Ledger: handleLoadMore called, using key:", lastEvaluatedKey);
      const paramsToFetch = { startDate, endDate, filterType, filterCustomerId, startKey: lastEvaluatedKey };
      fetchLedgerEntries(paramsToFetch, true); // True = Load more
  }

  // --- Manual Entry Form Handling ---
  const handleManualFormChange = (e) => { const { name, value, type } = e.target; setManualEntry(prev => ({ ...prev, [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value })); };
  const handleManualEntrySubmit = async (e) => {
      e.preventDefault(); if (isSubmittingManual) return; setIsSubmittingManual(true); setError(null);
      if (!manualEntry.entryDate || !manualEntry.description.trim() || !manualEntry.amount || manualEntry.amount <= 0) { toast({ title: "Validation Error", description: "Date, Description, positive Amount required.", status: "error" }); setIsSubmittingManual(false); return; }
      const payload = { entryType: manualEntry.entryType, entryDate: manualEntry.entryDate, description: manualEntry.description.trim(), amount: manualEntry.amount };
      console.log(`POST ${apiName}${LEDGER_PATH} manual entry:`, payload); // Use apiName
      try {
          const operation = post({ apiName: apiName, path: LEDGER_PATH, options: { body: payload } }); // Use apiName
          const response = await operation.response;
          if (response.statusCode >= 201 && response.statusCode < 300) { const savedEntry = await response.body.json(); console.log("Manual entry saved:", savedEntry); closeModal(); setManualEntry({...EMPTY_MANUAL_FORM}); fetchLedgerEntries({ startDate, endDate, filterType, filterCustomerId }, false); toast({ title: "Manual Entry Added", status: "success"}); }
          else { let eMsg=`Save fail: ${response.statusCode}.`; try{const b=await response.body.json();eMsg+=` ${b?.error||b?.message||''}`}catch(ign){} throw new Error(eMsg); }
      } catch (err) { console.error("Error manual save:", err); toast({ title: `Save Failed`, description: err.message || 'Unknown', status: "error"}); }
      finally { setIsSubmittingManual(false); }
  };

  // --- Calculate Summaries ---
  const summary = useMemo(() => { let income = 0; let expense = 0; entries.forEach(entry => { if (entry.entryType === 'INCOME') { income += entry.amount || 0; } else if (entry.entryType === 'EXPENSE') { expense += entry.amount || 0; } }); return { totalIncome: income, totalExpense: expense, net: income - expense }; }, [entries]);

  // --- Clear Customer Filter ---
  const clearCustomerFilter = () => { setFilterCustomerId(''); /* setSearchParams update happens in useEffect */ };

  // --- Render Logic ---
  return (
    <Container maxW="container.xl" py={8}>
      <Box bg="white" p={6} rounded="md" shadow="md">
        {/* Header */}
        <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={2}> <Heading size="lg">Ledger</Heading> <HStack> <Button onClick={() => navigate('/')} variant="outline" size="sm">Dashboard</Button> <Button colorScheme="teal" size="sm" onClick={openModal}> + Add Manual Entry </Button> </HStack> </Flex>

        {/* Filters */}
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={6}>
           <FormControl> <FormLabel fontSize="sm">Start Date</FormLabel> <Input type="date" size="sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} /> </FormControl>
           <FormControl> <FormLabel fontSize="sm">End Date</FormLabel> <Input type="date" size="sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} /> </FormControl>
           <FormControl> <FormLabel fontSize="sm">Filter Type</FormLabel> <Select size="sm" value={filterType} onChange={(e) => setFilterType(e.target.value)}> <option value='ALL'>All Types</option> <option value='INCOME'>Income Only</option> <option value='EXPENSE'>Expense Only</option> </Select> </FormControl>
           {filterCustomerId && filterCustomerId !== 'MANUAL_ENTRY' && ( <Tag size="lg" colorScheme="purple" gridColumn={{ base: 'span 1', md:'span 3' }} justifyContent="center"> Filtering Customer: {filterCustomerId.substring(0,8)}... <Button size="xs" ml={3} onClick={clearCustomerFilter}>Clear</Button> </Tag> )}
        </SimpleGrid>

        {/* Summary Section */}
        <StatGroup mb={6} p={4} bg="gray.50" borderRadius="md" textAlign="center">
            <Stat> <StatLabel>Total Income</StatLabel> <StatNumber color="green.600">₹{summary.totalIncome.toFixed(2)}</StatNumber> </Stat>
            <Stat> <StatLabel>Total Expense</StatLabel> <StatNumber color="red.600">₹{summary.totalExpense.toFixed(2)}</StatNumber> </Stat>
            <Stat> <StatLabel>Net Income</StatLabel> <StatNumber color={summary.net >= 0 ? 'blue.600' : 'red.600'}>₹{summary.net.toFixed(2)}</StatNumber> </Stat>
        </StatGroup>

        {/* Status/Error Alert */}
        {error && ( <Alert status='error' variant='subtle' borderRadius="md" mb={4}> <AlertIcon /> {error} </Alert> )}
        {statusMessage && !error && ( <Alert status={messageType} variant='subtle' borderRadius="md" mb={4}> <AlertIcon /> {statusMessage} </Alert> )}

        {/* Ledger Table */}
        <Heading size="md" mb={4}>Transactions</Heading>
        {(isLoading && entries.length === 0) && <Flex justify="center" py={10}><Spinner size="xl" color="teal.500" /></Flex>}
        {!isLoading && entries.length === 0 && !error && (<Text>No entries match the current filters.</Text>)}
        {entries.length > 0 && ( // Render table if entries exist, even if loading more
            <>
                <TableContainer border="1px" borderColor="gray.100" borderRadius="md">
                    <Table variant='simple' size="sm">
                        <Thead bg="gray.50"><Tr><Th>Date</Th><Th>Type</Th><Th>Description</Th><Th>Related Doc/Cust</Th><Th isNumeric>Amount (INR)</Th></Tr></Thead>
                        <Tbody>
                        {entries.map((entry) => (
                            <Tr key={entry.entryId}>
                                <Td>{entry.entryDate}</Td>
                                <Td><Tag size="sm" colorScheme={entry.entryType === 'INCOME' ? 'green' : 'red'}>{entry.entryType}</Tag></Td>
                                <Td>{entry.description}</Td>
                                <Td fontSize="xs" color="gray.500"> {entry.relatedDocumentId ? `Doc: ${entry.relatedDocumentId.substring(0,8)}...` : (entry.customerId && entry.customerId !== 'MANUAL_ENTRY' ? `Cust: ${entry.customerId.substring(0,8)}...` : '-')} </Td>
                                <Td isNumeric color={entry.entryType === 'INCOME' ? 'green.600' : 'red.600'} fontWeight="medium"> {entry.entryType === 'EXPENSE' ? '-' : ''}₹{(entry.amount || 0).toFixed(2)} </Td>
                            </Tr>
                        ))}
                        </Tbody>
                    </Table>
                </TableContainer>

                {/* Load More Button Area */}
                <Flex justify="center" mt={4}>
                    {lastEvaluatedKey && !isLoadingMore && ( <Button onClick={handleLoadMore} size="sm" colorScheme="gray">Load More</Button> )}
                    {isLoadingMore && ( <Button isLoading loadingText='Loading...' size="sm" colorScheme="gray" variant="outline" isDisabled /> )}
                </Flex>
            </>
        )}

        {/* Manual Entry Modal */}
        <Modal isOpen={isModalOpen} onClose={closeModal} isCentered>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Add Manual Ledger Entry</ModalHeader>
                <ModalCloseButton />
                <form onSubmit={handleManualEntrySubmit}>
                    <ModalBody pb={6}>
                        <VStack spacing={4}>
                             <FormControl isRequired> <FormLabel>Entry Type</FormLabel> <Select name="entryType" value={manualEntry.entryType} onChange={handleManualFormChange}> <option value='EXPENSE'>Expense</option> <option value='INCOME'>Income</option> </Select> </FormControl>
                             <FormControl isRequired> <FormLabel>Date</FormLabel> <Input type="date" name="entryDate" value={manualEntry.entryDate} onChange={handleManualFormChange} /> </FormControl>
                              <FormControl isRequired> <FormLabel>Description</FormLabel> <Input name="description" value={manualEntry.description} onChange={handleManualFormChange} placeholder="e.g., Office Supplies, Cash Sale" /> </FormControl>
                             <FormControl isRequired> <FormLabel>Amount</FormLabel> <InputGroup> <InputLeftAddon>₹</InputLeftAddon> <Input type="number" name="amount" value={manualEntry.amount} onChange={handleManualFormChange} placeholder="0.00" min="0.01" step="0.01" /> </InputGroup> </FormControl>
                        </VStack>
                    </ModalBody>
                    <ModalFooter> <Button variant="ghost" mr={3} onClick={closeModal} isDisabled={isSubmittingManual}> Cancel </Button> <Button type="submit" colorScheme="teal" isLoading={isSubmittingManual} loadingText="Adding..."> Add Entry </Button> </ModalFooter>
                </form>
            </ModalContent>
        </Modal>

      </Box>
    </Container>
  );
}
export default Ledger;