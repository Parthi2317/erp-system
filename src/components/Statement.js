// src/components/Statement.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get } from 'aws-amplify/api';
import {
  Box,
  Heading,
  Text,
  Spinner,
  useToast,
  Button,
  VStack,
  Divider,
  Tag,
  Flex,
  Spacer,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Alert,
  AlertIcon
} from '@chakra-ui/react';

function Statement() {
    const { customerId } = useParams();
    const navigate = useNavigate();
    const toast = useToast();

    const [statement, setStatement] = useState(null);
    const [customerName, setCustomerName] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const apiName = 'inventoryApi';

    const fetchStatement = useCallback(async () => {
        if (!customerId) return;
        setIsLoading(true);
        setError(null);

        try {
            const restOperation = get({
                apiName: apiName,
                path: `/statement/${customerId}`
            });
            const { body } = await restOperation.response;
            const data = await body.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            setStatement(data);
        } catch (err) {
            console.error("Failed to fetch statement data", err);
            const errorMessage = err.message || 'A network error occurred while fetching the statement.';
            setError(errorMessage);
            toast({
                title: 'Error Loading Statement',
                description: errorMessage,
                status: 'error',
                duration: 6000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    }, [customerId, apiName, toast]);

    const fetchCustomerName = useCallback(async () => {
        if (!customerId) return;
        try {
            // **** THIS IS THE FIX ****
            // Changed path from `/customers/...` to `/Customers/...`
            const restOperation = get({
                apiName: apiName,
                path: `/Customers/${customerId}` 
            });
            // **** END OF FIX ****
            
            const { body } = await restOperation.response;
            const data = await body.json();
            if (data.name) {
                setCustomerName(data.name);
            }
        } catch (err) {
            console.warn("Could not fetch customer name", err);
        }
    }, [customerId, apiName]);

    useEffect(() => {
        fetchStatement();
        fetchCustomerName();
    }, [fetchStatement, fetchCustomerName]);


    if (isLoading) {
        return <Flex justify="center" align="center" h="100vh"><Spinner size="xl" color="teal.500" /></Flex>;
    }

    if (error) {
        return (
            <Box p={8}>
                <Alert status="error" borderRadius="md">
                    <AlertIcon />
                    <Box>
                        <Text fontWeight="bold">Failed to load statement.</Text>
                        <Text fontSize="sm">{error}</Text>
                    </Box>
                </Alert>
                <Button mt={4} onClick={() => navigate('/customers')}>Back to Customers</Button>
            </Box>
        );
    }

    return (
        <Box p={{ base: 4, md: 8 }}>
            <Flex alignItems="center" mb={6}>
                <Box>
                    <Heading size="lg">Statement for {customerName || 'Customer'}</Heading>
                    <Text fontSize="sm" color="gray.500">Customer ID: {customerId}</Text>
                </Box>
                <Spacer />
                <Button onClick={() => navigate('/customers')} variant="outline">Back to Customers</Button>
            </Flex>

            <Box p={6} bg={statement?.totalAmountDue > 0 ? "red.50" : "green.50"} borderWidth="1px" borderColor={statement?.totalAmountDue > 0 ? "red.200" : "green.200"} borderRadius="md" mb={8} textAlign="center">
                <Text fontSize="sm" fontWeight="bold" color={statement?.totalAmountDue > 0 ? "red.600" : "green.600"}>TOTAL AMOUNT DUE</Text>
                <Heading size="2xl" color={statement?.totalAmountDue > 0 ? "red.700" : "green.700"}>
                    ₹{(statement?.totalAmountDue || 0).toFixed(2)}
                </Heading>
            </Box>

            <VStack spacing={8} align="stretch">
                <Box>
                    <Heading size="md" mb={4}>Outstanding Bills</Heading>
                    {statement?.outstandingBills && statement.outstandingBills.length > 0 ? (
                        <TableContainer>
                            <Table variant="simple" size="sm">
                                <Thead>
                                    <Tr><Th>Bill ID</Th><Th>Date</Th><Th isNumeric>Bill Total</Th><Th isNumeric>Amount Paid</Th><Th isNumeric>Amount Due</Th></Tr>
                                </Thead>
                                <Tbody>
                                    {statement.outstandingBills.map(bill => (
                                        <Tr key={bill.documentId}>
                                            <Td>{bill.documentId.substring(0,8)}...</Td>
                                            <Td>{new Date(bill.documentDate).toLocaleDateString()}</Td>
                                            <Td isNumeric>₹{(bill.grandTotal || 0).toFixed(2)}</Td>
                                            <Td isNumeric>₹{(bill.amountPaid || 0).toFixed(2)}</Td>
                                            <Td isNumeric color="red.500" fontWeight="bold">₹{((bill.grandTotal || 0) - (bill.amountPaid || 0)).toFixed(2)}</Td>
                                        </Tr>
                                    ))}
                                </Tbody>
                            </Table>
                        </TableContainer>
                    ) : (
                        <Text>This customer has no outstanding bills. ✅</Text>
                    )}
                </Box>
                
                <Divider />

                {/* --- START: Replace the old "Recent History" section with this --- */}
<Box>
    <Heading size="md" mb={4}>Complete Transaction History</Heading>
    {statement?.paymentHistory && statement.paymentHistory.length > 0 ? (
         <TableContainer>
             <Table variant="simple" size="sm">
                <Thead>
                    <Tr>
                        <Th>Date & Time</Th>
                        <Th>Description</Th>
                        <Th>Related Bill</Th>
                        <Th>Type</Th>
                        <Th isNumeric>Amount (INR)</Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {statement.paymentHistory.map(entry => (
                        <Tr key={entry.entryId}>
                            {/* Use createdAt for the full timestamp */}
                            <Td>{new Date(entry.createdAt).toLocaleString()}</Td>
                            
                            <Td>{entry.description}</Td>
                            
                            {/* Display the linked bill ID, if it exists */}
                            <Td fontFamily="monospace" fontSize="xs">
                                {entry.relatedDocumentId ? entry.relatedDocumentId.substring(0, 8) + '...' : '-'}
                            </Td>
                            
                            <Td>
                                <Tag colorScheme={entry.entryType === 'INCOME' ? 'green' : 'red'}>
                                    {entry.entryType}
                                </Tag>
                            </Td>

                            <Td isNumeric color={entry.entryType === 'INCOME' ? 'green.500' : 'red.500'} fontWeight="medium">
                                ₹{entry.amount.toFixed(2)}
                            </Td>
                        </Tr>
                    ))}
                </Tbody>
            </Table>
         </TableContainer>
    ) : (
        <Text>No transactions found for this customer.</Text>
    )}
</Box>
{/* --- END: Replacement section --- */}
            </VStack>
        </Box>
    );
}

export default Statement;