// src/components/CustomerStatement.js
// --- NEW FILE ---

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get } from 'aws-amplify/api';
import {
  Box, Heading, Text, Button, Container, Table, Thead, Tbody, Tr, Th, Td,
  TableContainer, Tag, Spinner, useToast, Flex, Spacer, VStack, Divider
} from '@chakra-ui/react';

function CustomerStatement() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();
  const apiName = 'inventoryApi';

  const fetchStatementData = useCallback(async () => {
    if (!customerId) return;
    setIsLoading(true);
    try {
      const [customerRes, billsRes] = await Promise.all([
        get({ apiName, path: `/Customers/${customerId}` }).response,
        get({ apiName, path: '/documents', options: { queryParams: { customerId, documentType: 'Bill' } } }).response
      ]);
      
      const customerData = await customerRes.body.json();
      const allBills = await billsRes.body.json();
      
      setCustomer(customerData);
      const outstandingBills = allBills.filter(b => b.status === 'Unpaid' || b.status === 'Partially Paid');
      setBills(outstandingBills);

    } catch (error) {
        toast({ title: 'Error', description: 'Could not load customer statement.', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [customerId, apiName, toast]);
  
  useEffect(() => {
    fetchStatementData();
  }, [fetchStatementData]);

  const totalAmountDue = bills.reduce((sum, bill) => sum + (bill.grandTotal - (bill.amountPaid || 0)), 0);

  if (isLoading) return <Flex justify="center" align="center" h="50vh"><Spinner size="xl" /></Flex>;

  return (
    <Container maxW="container.xl" py={8}>
        <Box bg="white" p={6} rounded="md" shadow="md">
            <Flex alignItems="center" mb={4}>
                <Box>
                    <Heading>Statement for {customer?.name}</Heading>
                    <Text fontSize="sm" color="gray.500">Customer ID: {customerId}</Text>
                </Box>
                <Spacer />
                <Button onClick={() => navigate('/customers')}>Back to Customers</Button>
            </Flex>
            <Divider my={4} />

            <Box p={4} bg="red.50" borderRadius="md" mb={6}>
                <VStack>
                    <Text fontSize="sm" color="red.700">TOTAL AMOUNT DUE</Text>
                    <Heading size="lg" color="red.600">
                        ₹{totalAmountDue.toFixed(2)}
                    </Heading>
                </VStack>
            </Box>

            <Heading size="md" mt={8} mb={4}>Outstanding Bills</Heading>
            {bills.length > 0 ? (
                <TableContainer>
                    <Table variant="simple" size="sm">
                    <Thead>
                        <Tr>
                            <Th>Bill ID</Th>
                            <Th>Date</Th>
                            <Th>Status</Th>
                            <Th isNumeric>Total</Th>
                            <Th isNumeric>Paid</Th>
                            <Th isNumeric>Balance Due</Th>
                            <Th>Action</Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {bills.map(bill => (
                        <Tr key={bill.documentId}>
                            <Td fontWeight="medium">{bill.documentId.substring(0,8)}...</Td>
                            <Td>{new Date(bill.documentDate).toLocaleDateString()}</Td>
                            <Td><Tag colorScheme={bill.status === 'Partially Paid' ? 'yellow' : 'red'}>{bill.status}</Tag></Td>
                            <Td isNumeric>₹{bill.grandTotal.toFixed(2)}</Td>
                            <Td isNumeric>₹{(bill.amountPaid || 0).toFixed(2)}</Td>
                            <Td isNumeric color="red.500" fontWeight="bold">₹{(bill.grandTotal - (bill.amountPaid || 0)).toFixed(2)}</Td>
                            <Td>
                                <Button size="xs" onClick={() => navigate('/documents')}>Go to Documents</Button>
                            </Td>
                        </Tr>
                        ))}
                    </Tbody>
                    </Table>
                </TableContainer>
            ) : (
                <Text>This customer has no outstanding bills. ✅</Text>
            )}
        </Box>
    </Container>
  );
}

export default CustomerStatement;