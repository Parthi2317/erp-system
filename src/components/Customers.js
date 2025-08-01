// src/components/Customers.js
// --- FINAL CORRECTED VERSION - Fixes the navigation path for the Statement button ---

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, post, put, del } from 'aws-amplify/api';
import {
  Box, Heading, Text, Button, Container, Table, Thead, Tbody, Tr, Th, Td,
  TableContainer, Alert, AlertIcon, VStack, FormControl, FormLabel, Input,
  HStack, Flex, useToast, Spinner,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, useDisclosure
} from '@chakra-ui/react';

const EMPTY_CUSTOMER_FORM = { name: '', phone: '', email: '', addressL1: '', addressL2: '', city: '', pincode: '', gstin: '' };
const API_NAME = 'inventoryApi';
const CUSTOMERS_PATH = '/Customers';

// CustomerForm Component (Remains unchanged)
const CustomerForm = ({ initialData, onSubmit, onCancel, isSubmitting }) => {
    const [formData, setFormData] = useState(initialData);
    useEffect(() => { setFormData(initialData || EMPTY_CUSTOMER_FORM); }, [initialData]);
    const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
    const handleSubmit = (e) => { e.preventDefault(); onSubmit(formData); };
    return ( <form onSubmit={handleSubmit}> <VStack spacing={4} align="stretch"><FormControl isRequired><FormLabel>Name</FormLabel><Input name="name" value={formData.name || ''} onChange={handleChange} placeholder="Customer Name" /></FormControl><FormControl isRequired><FormLabel>Phone</FormLabel><Input name="phone" type="tel" value={formData.phone || ''} onChange={handleChange} placeholder="Phone Number" /></FormControl><FormControl><FormLabel>Email</FormLabel><Input name="email" type="email" value={formData.email || ''} onChange={handleChange} placeholder="Email Address" /></FormControl><FormControl><FormLabel>Address Line 1</FormLabel><Input name="addressL1" value={formData.addressL1 || ''} onChange={handleChange} placeholder="Address Line 1" /></FormControl><HStack justify="flex-end" mt={4}><Button variant="ghost" onClick={onCancel}>Cancel</Button><Button type="submit" colorScheme="teal" isLoading={isSubmitting}>Save</Button></HStack></VStack></form> );
};

// Main Customers Component
function Customers() {
    const navigate = useNavigate();
    const toast = useToast();
    const { isOpen: isModalOpen, onOpen: openModal, onClose: closeModal } = useDisclosure();

    const [customers, setCustomers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(null);

    // This logic to calculate dues on the frontend is clever and efficient!
    const fetchCustomersAndDues = useCallback(async () => {
        setIsLoading(true); setError(null);
        try {
            const [customersRes, documentsRes] = await Promise.all([
                get({ apiName: API_NAME, path: CUSTOMERS_PATH }).response,
                get({ apiName: API_NAME, path: '/documents' }).response
            ]);
            const customersData = await customersRes.body.json();
            const documentsData = await documentsRes.body.json();
            const duesMap = new Map();
            documentsData.forEach(doc => {
                if (doc.documentType === 'Bill' && (doc.status === 'Unpaid' || doc.status === 'Partially Paid')) {
                    const due = (doc.grandTotal || 0) - (doc.amountPaid || 0);
                    const currentDue = duesMap.get(doc.customerId) || 0;
                    duesMap.set(doc.customerId, currentDue + due);
                }
            });
            const customersWithDues = customersData.map(cust => ({ ...cust, amountDue: duesMap.get(cust.customerId) || 0 }));
            setCustomers(customersWithDues.sort((a,b) => (a.name || '').localeCompare(b.name || '')));
            if (customersWithDues.length === 0) setError('No customers found. Add one!');
        } catch (err) {
            setError(err.message || 'Failed to load customer data.');
            console.error("Error fetching customer data:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchCustomersAndDues(); }, [fetchCustomersAndDues]);

    const handleSaveCustomer = async (formData) => {
        setIsSubmitting(true);
        const isEdit = !!editingCustomer?.customerId;
        const path = isEdit ? `${CUSTOMERS_PATH}/${editingCustomer.customerId}` : CUSTOMERS_PATH;
        const method = isEdit ? put : post;
        try {
            await method({ apiName: API_NAME, path, options: { body: formData } });
            closeModalAndReset();
            fetchCustomersAndDues();
            toast({ title: `Customer ${isEdit ? 'Updated' : 'Added'}`, status: "success" });
        } catch (err) {
            toast({ title: `Failed to ${isEdit ? 'Update' : 'Add'}`, description: err.message, status: "error"});
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteCustomer = async (customerId, customerName) => {
        if (window.confirm(`Delete customer "${customerName}"? This cannot be undone.`)) {
            setIsDeleting(customerId);
            try {
                await del({ apiName: API_NAME, path: `${CUSTOMERS_PATH}/${customerId}` });
                toast({ title: `${customerName} Deleted`, status: 'success' });
                fetchCustomersAndDues();
            } catch (err) {
                toast({ title: `Delete Failed`, description: err.message, status: 'error' });
            } finally {
                setIsDeleting(null);
            }
        }
    };

    const openAddModal = () => { setEditingCustomer(null); openModal(); };
    const openEditModal = (customer) => { setEditingCustomer(customer); openModal(); };
    const closeModalAndReset = () => { setEditingCustomer(null); closeModal(); };

    return (
        <Container maxW="container.xl" py={8}>
            <Box bg="white" p={6} rounded="md" shadow="md">
                <Flex justify="space-between" align="center" mb={6}>
                    <Heading size="lg">Customer Management</Heading>
                    <HStack> <Button colorScheme="teal" onClick={openAddModal}>+ Add Customer</Button> <Button onClick={() => navigate('/')} variant="outline">Dashboard</Button> </HStack>
                </Flex>
                {error && !(error.includes('No customers found')) && <Alert status='error' mb={6}><AlertIcon />{error}</Alert>}
                {isLoading ? <Flex justify="center" py={10}><Spinner size="xl"/></Flex> : (
                    <TableContainer border="1px" borderColor="gray.100" borderRadius="md">
                        <Table variant='simple' size="sm">
                            <Thead bg="gray.50"><Tr><Th>Name</Th><Th>Phone</Th><Th isNumeric>Amount Due</Th><Th>Actions</Th></Tr></Thead>
                            <Tbody>
                            {customers.map((cust) => (
                                <Tr key={cust.customerId}>
                                    <Td fontWeight="medium">{cust.name}</Td>
                                    <Td>{cust.phone}</Td>
                                    <Td isNumeric fontWeight={cust.amountDue > 0 ? "bold" : "normal"} color={cust.amountDue > 0 ? "red.500" : "inherit"}>
                                        ₹{(cust.amountDue || 0).toFixed(2)}
                                    </Td>
                                    <Td>
                                        {/* --- THIS IS THE CORRECTED LINE --- */}
                                        <Button size="xs" variant="ghost" colorScheme="teal" mr={2} onClick={() => navigate(`/statement/${cust.customerId}`)} title="View Customer Statement">
                                            Statement
                                        </Button>
                                        <Button size="xs" variant="ghost" colorScheme="yellow" mr={2} onClick={() => openEditModal(cust)} isDisabled={isDeleting === cust.customerId}>
                                            Edit
                                        </Button>
                                        <Button size="xs" variant="ghost" colorScheme="red" onClick={() => handleDeleteCustomer(cust.customerId, cust.name)} isLoading={isDeleting === cust.customerId}>
                                            Del
                                        </Button>
                                    </Td>
                                </Tr>
                            ))}
                            </Tbody>
                        </Table>
                    </TableContainer>
                )}
                 <Modal isOpen={isModalOpen} onClose={closeModalAndReset} size="xl" isCentered>
                     <ModalOverlay />
                     <ModalContent>
                         <ModalHeader>{editingCustomer ? `Edit: ${editingCustomer.name}` : 'Add New Customer'}</ModalHeader>
                         <ModalCloseButton />
                         <ModalBody pb={6}>
                             <CustomerForm initialData={editingCustomer ? {...editingCustomer} : EMPTY_CUSTOMER_FORM} onSubmit={handleSaveCustomer} onCancel={closeModalAndReset} isSubmitting={isSubmitting} />
                         </ModalBody>
                     </ModalContent>
                 </Modal>
            </Box>
        </Container>
    );
}
export default Customers;