// src/components/DocumentsView.js
// --- FINAL VERIFIED VERSION - Implements "Delete Quotation" and fixes PDF formatting ---

import React, { useState, useEffect, useCallback } from 'react';
import { get, post, del } from 'aws-amplify/api';
import { useNavigate } from 'react-router-dom';
import {
  Box, Heading, VStack, HStack, FormControl, FormLabel, Input, Select, Button,
  Table, Thead, Tbody, Tr, Th, Td, TableContainer, Tag, Spinner, useToast, Text,
  Flex, Spacer, InputGroup, InputLeftAddon,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, useDisclosure, Divider
} from '@chakra-ui/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function DocumentsView() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filters, setFilters] = useState({ startDate: '', endDate: '', customerId: '', documentType: 'ALL' });
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();
  const { isOpen: isViewModalOpen, onOpen: openViewModal, onClose: closeViewModal } = useDisclosure();
  const [viewingDocument, setViewingDocument] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const { isOpen: isPaymentModalOpen, onOpen: openPaymentModal, onClose: closePaymentModal } = useDisclosure();
  const [paymentDocument, setPaymentDocument] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(null);
  const apiName = 'inventoryApi';

  const fetchDocuments = useCallback(async (currentFilters) => {
    setIsLoading(true);
    try {
      const queryParams = {};
      if (currentFilters.documentType && currentFilters.documentType !== 'ALL') queryParams.documentType = currentFilters.documentType;
      if (currentFilters.startDate) queryParams.startDate = currentFilters.startDate;
      if (currentFilters.endDate) queryParams.endDate = currentFilters.endDate;
      if (currentFilters.customerId) queryParams.customerId = currentFilters.customerId;
      const { body } = await get({ apiName, path: '/documents', options: { queryParams } }).response;
      setDocuments(await body.json());
    } catch (error) { toast({ title: 'Error', description: 'Could not load documents.', status: 'error' });
    } finally { setIsLoading(false); }
  }, [apiName, toast]);

  useEffect(() => {
    const fetchCustomers = async () => {
      try { const { body } = await get({ apiName, path: '/Customers' }).response; setCustomers(await body.json()); } catch (error) { toast({ title: 'Error', description: 'Could not load customers.', status: 'error' }); }
    };
    fetchCustomers();
    fetchDocuments({ startDate: '', endDate: '', customerId: '', documentType: 'ALL' });
  }, [fetchDocuments, apiName, toast]);

  const handleFilterChange = (e) => setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleSearch = () => fetchDocuments(filters);
  const handleClearFilters = () => { const clearedFilters = { startDate: '', endDate: '', customerId: '', documentType: 'ALL' }; setFilters(clearedFilters); fetchDocuments(clearedFilters); };
  const handleOpenPaymentModal = (doc) => { setPaymentDocument(doc); const remainingBalance = doc.grandTotal - (doc.amountPaid || 0); setPaymentAmount(remainingBalance > 0 ? remainingBalance.toFixed(2) : ''); setPaymentDate(new Date().toISOString().split('T')[0]); openPaymentModal(); };
  const handleSavePayment = async () => { if (!paymentDocument || !paymentAmount || Number(paymentAmount) <= 0) { toast({ title: "Invalid Amount", status: "error" }); return; } setIsSubmittingPayment(true); try { await post({ apiName, path: `/documents/${paymentDocument.documentId}/payment`, options: { body: { amount: Number(paymentAmount), paymentDate } } }).response; toast({ title: "Payment Recorded!", status: "success" }); closePaymentModal(); fetchDocuments(filters); } catch (error) { const errorMsg = (error.response && await error.response.body.json().error) || 'Could not record payment.'; toast({ title: "Error", description: errorMsg, status: "error" }); } finally { setIsSubmittingPayment(false); } };
  const handleViewDocument = async (docId) => { openViewModal(); setIsLoadingDetails(true); try { const { body } = await get({ apiName, path: `/documents/${docId}` }).response; setViewingDocument(await body.json()); } catch (error) { toast({ title: 'Error', description: 'Could not load document details.', status: 'error' }); } finally { setIsLoadingDetails(false); } };
  const handleEdit = (doc) => navigate(`/quotations/${doc.documentId}`);
  
  // --- MODIFIED: Renamed handleCancel and made message dynamic ---
  const handleDeleteOrCancel = async (doc) => {
    const isQuote = doc.documentType === 'Quotation';
    const actionText = isQuote ? 'delete' : 'cancel';
    const message = isQuote
      ? `Are you sure you want to delete this ${doc.documentType}? This cannot be undone.`
      : `Are you sure you want to cancel this ${doc.documentType}? This will restore stock and reverse all payments in the ledger.`;

    if (window.confirm(message)) {
      try {
        await del({ apiName, path: `/documents/${doc.documentId}` });
        toast({ title: `Document ${actionText}d`, status: "success" });
        fetchDocuments(filters);
      } catch (error) {
        const errorMsg = (error.response && await error.response.body.json().error) || `Could not ${actionText} document.`;
        toast({ title: "Error", description: errorMsg, status: "error" });
      }
    }
  };

  // --- MODIFIED: Fixed PDF formatting issue ---
  const generatePDF = async (docHeaderData) => {
    setIsPdfLoading(docHeaderData.documentId);
    try {
      const { body } = await get({ apiName, path: `/documents/${docHeaderData.documentId}` }).response;
      const fullDocument = await body.json();
      const doc = new jsPDF();
      
      // Document Header
      doc.setFontSize(20); doc.text(fullDocument.documentType || 'Document', 14, 22);
      doc.setFontSize(12); doc.text(`ID: ${fullDocument.documentId || 'N/A'}`, 14, 32);
      doc.text(`Date: ${fullDocument.documentDate ? new Date(fullDocument.documentDate).toLocaleDateString() : 'N/A'}`, 14, 38);
      doc.setFontSize(14); doc.text("Customer:", 120, 32); doc.setFontSize(12); doc.text(fullDocument.customerName || 'N/A', 120, 38);
      
      // Main Items Table
      autoTable(doc, {
        head: [["#", "Product", "Qty", "Price (INR)", "Total (INR)"]],
        body: (fullDocument.items || []).map((item, index) => [
             index + 1,
             item.name || 'N/A',
             item.quantity,
             (item.price || 0).toFixed(2),
             ((item.quantity || 0) * (item.price || 0)).toFixed(2)
        ]),
        startY: 50,
      });
      let finalY = doc.lastAutoTable.finalY || 80;

      // Payment History Table
      if(fullDocument.payments && fullDocument.payments.length > 0) {
        doc.setFontSize(12);
        doc.text(`Payments Received:`, 14, finalY + 10);
        autoTable(doc, {
            head: [["Payment Date & Time", "Amount Paid (INR)"]],
            body: fullDocument.payments.map(p => [
                new Date(p.createdAt).toLocaleString(),
                (p.amount || 0).toFixed(2)
            ]),
            startY: finalY + 12,
            theme: 'grid'
        });
        finalY = doc.lastAutoTable.finalY;
      }
      
      // Final Totals Section
      doc.setFontSize(12);
      doc.text(`Bill Total:`, 14, finalY + 15);
      doc.text(`₹${(fullDocument.grandTotal || 0).toFixed(2)}`, 60, finalY + 15);
      
      doc.text(`Total Paid:`, 14, finalY + 22);
      doc.text(`₹${(fullDocument.amountPaid || 0).toFixed(2)}`, 60, finalY + 22);
      
      doc.setFont(undefined, 'bold');
      doc.text(`Balance Due:`, 14, finalY + 29);
      doc.text(`₹${((fullDocument.grandTotal || 0) - (fullDocument.amountPaid || 0)).toFixed(2)}`, 60, finalY + 29);
      doc.setFont(undefined, 'normal');
      
      const fileName = `${fullDocument.documentType}-${(fullDocument.customerName || 'C').replace(/\s/g, '_')}-${fullDocument.documentId.substring(0, 8)}.pdf`;
      doc.save(fileName);
    } catch (error) { toast({ title: 'PDF Error', description: 'Could not generate PDF.', status: 'error' });
    } finally { setIsPdfLoading(null); }
  };
  
  return (
    <Box p={8}>
      <Flex alignItems="center" mb={6}><Heading>Manage Documents</Heading><Spacer /><Button onClick={() => navigate('/')}>Dashboard</Button></Flex>
      <HStack spacing={4} mb={6} p={4} borderWidth="1px" borderRadius="md" alignItems="flex-end">
        <FormControl><FormLabel fontSize="sm">Type</FormLabel><Select name="documentType" value={filters.documentType} onChange={handleFilterChange}><option value="ALL">All Types</option><option value="Bill">Bills</option><option value="Quotation">Quotations</option></Select></FormControl>
        <FormControl><FormLabel fontSize="sm">Start Date</FormLabel><Input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} /></FormControl>
        <FormControl><FormLabel fontSize="sm">End Date</FormLabel><Input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} /></FormControl>
        <FormControl><FormLabel fontSize="sm">Customer</FormLabel><Select name="customerId" placeholder="All Customers" value={filters.customerId} onChange={handleFilterChange}>{customers.map(c => <option key={c.customerId} value={c.customerId}>{c.name}</option>)}</Select></FormControl>
        <VStack> <Button colorScheme="teal" onClick={handleSearch}>Search</Button> <Button variant="link" size="sm" onClick={handleClearFilters}>Clear</Button> </VStack>
      </HStack>
      {isLoading ? (<Spinner />) : (
        <TableContainer>
          <Table variant="simple" size="sm">
            <Thead><Tr><Th>ID / Type</Th><Th>Customer</Th><Th>Date</Th><Th>Status</Th><Th isNumeric>Total / Paid</Th><Th>Actions</Th></Tr></Thead>
            <Tbody>
              {documents.map(doc => (
                <Tr key={doc.documentId} bg={doc.status === 'Cancelled' ? 'gray.100' : 'white'} opacity={doc.status === 'Cancelled' ? 0.6 : 1}>
                  <Td><VStack align="start" spacing={0}><Text fontWeight="bold">{doc.documentId.substring(0, 8)}...</Text><Tag size="sm" colorScheme={doc.documentType === 'Bill' ? 'orange' : 'blue'}>{doc.documentType}</Tag></VStack></Td>
                  <Td>{doc.customerName}</Td>
                  <Td>{new Date(doc.documentDate).toLocaleDateString()}</Td>
                  <Td><Tag colorScheme={ doc.status === 'Paid' ? 'green' : doc.status === 'Partially Paid' ? 'yellow' : doc.status === 'Unpaid' ? 'red' : 'gray' }>{doc.status}</Tag></Td>
                  <Td isNumeric><VStack spacing={0} align="flex-end"><Text as={doc.status === 'Cancelled' ? 's' : 'span'} fontWeight="bold">₹{(doc.grandTotal || 0).toFixed(2)}</Text>{(doc.amountPaid > 0) && <Text fontSize="xs" color="green.600">₹{(doc.amountPaid || 0).toFixed(2)} Paid</Text>}</VStack></Td>
                  <Td>
                    <HStack>
                      <Button size="xs" variant="ghost" isLoading={isPdfLoading === doc.documentId} onClick={() => handleViewDocument(doc.documentId)}>View</Button>
                      <Button size="xs" variant="ghost" colorScheme="teal" isLoading={isPdfLoading === doc.documentId} onClick={() => generatePDF(doc)}>PDF</Button>
                      {(doc.documentType === 'Bill' && doc.status === 'Unpaid') && <Button size="xs" colorScheme="blue" onClick={() => handleEdit(doc)}>Edit</Button>}
                      {(doc.paymentTerms === 'Pay in Installments' && doc.status !== 'Paid' && doc.status !== 'Cancelled') && <Button size="xs" colorScheme="green" onClick={() => handleOpenPaymentModal(doc)}>Payment</Button>}
                      
                      {/* --- MODIFIED: Use new handler and show different buttons based on type --- */}
                      {(doc.documentType === 'Bill' && doc.status !== 'Cancelled') && <Button size="xs" colorScheme="red" onClick={() => handleDeleteOrCancel(doc)}>Cancel</Button>}
                      {(doc.documentType === 'Quotation') && <Button size="xs" colorScheme="red" variant="ghost" onClick={() => handleDeleteOrCancel(doc)}>Delete</Button>}

                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      )}
      <Modal isOpen={isPaymentModalOpen} onClose={closePaymentModal} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Record Payment</ModalHeader><ModalCloseButton />
          <ModalBody>{paymentDocument && (<VStack spacing={4}><Text>For Bill: <strong>{paymentDocument.documentId.substring(0,8)}...</strong></Text><Text>Total: <strong>₹{(paymentDocument.grandTotal||0).toFixed(2)}</strong> / Paid: <strong>₹{(paymentDocument.amountPaid||0).toFixed(2)}</strong></Text><FormControl isRequired><FormLabel>Payment Amount Received</FormLabel><InputGroup><InputLeftAddon>₹</InputLeftAddon><Input type="number" value={paymentAmount} onChange={(e)=>setPaymentAmount(e.target.value)} autoFocus/></InputGroup></FormControl><FormControl isRequired><FormLabel>Payment Date</FormLabel><Input type="date" value={paymentDate} onChange={(e)=>setPaymentDate(e.target.value)}/></FormControl></VStack>)}</ModalBody>
          <ModalFooter><Button variant="ghost" mr={3} onClick={closePaymentModal}>Cancel</Button><Button colorScheme="green" onClick={handleSavePayment} isLoading={isSubmittingPayment}>Save Payment</Button></ModalFooter>
        </ModalContent>
      </Modal>
      <Modal isOpen={isViewModalOpen} onClose={closeViewModal} size="3xl" isCentered scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>View {viewingDocument?.documentType}</ModalHeader><ModalCloseButton />
          <ModalBody>
            {isLoadingDetails ? <Spinner/> : viewingDocument && (
              <VStack align="stretch" spacing={4}>
                <HStack justify="space-between"><Text><strong>Customer:</strong> {viewingDocument.customerName}</Text><Text><strong>Date:</strong> {new Date(viewingDocument.documentDate).toLocaleDateString()}</Text></HStack>
                <Divider />
                <Heading size="sm">Items</Heading>
                <TableContainer><Table variant="striped" size="sm"><Thead><Tr><Th>Product</Th><Th isNumeric>Qty</Th><Th isNumeric>Price</Th><Th isNumeric>Total</Th></Tr></Thead><Tbody>{(viewingDocument.items||[]).map(item=>(<Tr key={item.productId||item.lineItemId}><Td>{item.name}</Td><Td isNumeric>{item.quantity}</Td><Td isNumeric>₹{(item.price||0).toFixed(2)}</Td><Td isNumeric>₹{((item.quantity||0)*(item.price||0)).toFixed(2)}</Td></Tr>))}</Tbody></Table></TableContainer>
                <Text fontWeight="bold" alignSelf="flex-end">Grand Total: ₹{(viewingDocument.grandTotal || 0).toFixed(2)}</Text>
                <Divider my={4} />
                <Heading size="sm">Payment History</Heading>
                {viewingDocument.payments && viewingDocument.payments.length > 0 ? (
                  <TableContainer w="full">
                    <Table variant="simple" size="sm">
                      <Thead><Tr><Th>Payment Date & Time</Th><Th isNumeric>Amount Paid (INR)</Th></Tr></Thead>
                      <Tbody>
                        {viewingDocument.payments.map(payment => (<Tr key={payment.entryId}><Td>{new Date(payment.createdAt).toLocaleString()}</Td><Td isNumeric>₹{(payment.amount || 0).toFixed(2)}</Td></Tr>))}
                        <Tr fontWeight="bold" bg="gray.50"><Td>Total Paid</Td><Td isNumeric>₹{(viewingDocument.amountPaid || 0).toFixed(2)}</Td></Tr>
                        <Tr fontWeight="bold" bg="gray.50"><Td color="red.500">Balance Due</Td><Td isNumeric color="red.500">₹{((viewingDocument.grandTotal || 0) - (viewingDocument.amountPaid || 0)).toFixed(2)}</Td></Tr>
                      </Tbody>
                    </Table>
                  </TableContainer>
                ) : (<Text fontSize="sm" color="gray.500">No payments have been recorded for this bill.</Text>)}
                {viewingDocument.payments && viewingDocument.payments.length > 0 && (
                    <Box pt={4} w="full">
                        <Divider />
                        <Heading size="sm" mt={4} mb={2}>Payment History</Heading>
                        <TableContainer border="1px" borderColor="gray.200" borderRadius="md">
                            <Table variant="simple" size="sm">
                                <Thead bg="gray.50"><Tr><Th>Payment Date</Th><Th isNumeric>Amount Paid (INR)</Th></Tr></Thead>
                                <Tbody>
                                    {viewingDocument.payments.map(p => (
                                        <Tr key={p.entryId}>
                                            <Td>{new Date(p.entryDate).toLocaleDateString()}</Td>
                                            <Td isNumeric>₹{(p.amount || 0).toFixed(2)}</Td>
                                        </Tr>
                                    ))}
                                </Tbody>
                            </Table>
                        </TableContainer>
                        <VStack align="flex-end" spacing={1} mt={2} fontSize="lg">
                            <Text fontWeight="bold" color="green.600">Total Paid: ₹{(viewingDocument.amountPaid || 0).toFixed(2)}</Text>
                            <Text fontWeight="bold" color="red.600">Balance Due: ₹{((viewingDocument.grandTotal || 0) - (viewingDocument.amountPaid || 0)).toFixed(2)}</Text>
                        </VStack>
                    </Box>
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter><Button onClick={closeViewModal}>Close</Button></ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
export default DocumentsView;