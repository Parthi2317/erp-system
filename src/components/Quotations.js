// src/components/Quotations.js
// --- FINAL COMPLETE VERSION - Includes full form for Create/Edit and all features ---

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { get, post, put } from 'aws-amplify/api';
import {
  Box, Heading, Text, Button, Container, Table, Thead, Tbody, Tr, Th, Td,
  TableContainer, Alert, AlertIcon, VStack, FormControl, FormLabel, Input,
  Textarea, HStack, SimpleGrid, Divider, Select as ChakraSelect,
  IconButton, Tag, Flex, useToast, Spinner,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, useDisclosure
} from '@chakra-ui/react';
import CreatableSelect from 'react-select/creatable';

const EMPTY_FORM_ITEM = { productId: '', quantity: 1, price: 0, name: '', lineTotal: 0 };
const EMPTY_CUSTOMER_FORM = { name: '', phone: '', email: '', gstin: '', addressL1: '', addressL2: '', city: '', pincode: '' };

const CustomerForm = ({ initialData, onSubmit, onCancel, isSubmitting }) => {
    const [formData, setFormData] = useState(initialData);
    useEffect(() => { setFormData(initialData || EMPTY_CUSTOMER_FORM); }, [initialData]);
    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSubmit = (e) => { e.preventDefault(); onSubmit(formData); };
    return ( <form onSubmit={handleSubmit}> <VStack spacing={4}> <FormControl isRequired><FormLabel>Name</FormLabel><Input name="name" value={formData.name || ''} onChange={handleChange}/></FormControl> <FormControl isRequired><FormLabel>Phone</FormLabel><Input name="phone" type="tel" value={formData.phone || ''} onChange={handleChange}/></FormControl> <HStack justify="flex-end" w="full"><Button variant="ghost" onClick={onCancel}>Cancel</Button><Button type="submit" colorScheme="teal" isLoading={isSubmitting}>Save</Button></HStack> </VStack> </form> );
};

function Quotations() {
  const navigate = useNavigate();
  const toast = useToast();
  const { documentId } = useParams();
  const [isEditMode, setIsEditMode] = useState(!!documentId);
  const { isOpen: isCustomerModalOpen, onOpen: openCustomerModal, onClose: closeCustomerModal } = useDisclosure();
  
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingCustomer, setIsSubmittingCustomer] = useState(false);
  const [formError, setFormError] = useState(null);
  
  const [formType, setFormType] = useState('Quotation');
  const [paymentTerms, setPaymentTerms] = useState('Pay in Full');
  const [selectedCustomerOption, setSelectedCustomerOption] = useState(null);
  const [newCustomerInputValue, setNewCustomerInputValue] = useState('');
  const [notes, setNotes] = useState('');
  const [formItems, setFormItems] = useState([{...EMPTY_FORM_ITEM}]);
  
  const apiName = 'inventoryApi';

  const resetForm = useCallback(() => { setSelectedCustomerOption(null); setNewCustomerInputValue(''); setNotes(''); setFormItems([{...EMPTY_FORM_ITEM}]); setFormType('Quotation'); setFormError(null); setPaymentTerms('Pay in Full'); }, []);
  const calculateGrandTotal = useCallback(() => formItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0), [formItems]);
  const handleItemChange = useCallback((index, field, value) => { setFormItems(currentItems => { const newItems=[...currentItems]; let currentItem={...newItems[index]}; if(field==='productId'){const p=products.find(p=>p.productId===value); currentItem={...EMPTY_FORM_ITEM,productId:value,name:p?.name||'',price:p?.price||0};}else if(field==='quantity'){const q=parseInt(value,10); currentItem.quantity=isNaN(q)||q<0?0:q;} currentItem.lineTotal=(currentItem.quantity||0)*(currentItem.price||0); newItems[index]=currentItem; return newItems; }); }, [products]);
  const addItemLine = useCallback(() => setFormItems(prev => [...prev, { ...EMPTY_FORM_ITEM }]), []);
  const removeItemLine = useCallback((index) => { if (formItems.length > 1) setFormItems(prev => prev.filter((_, i) => i !== index)); }, [formItems.length]);
  
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const [productsRes, customersRes] = await Promise.all([
          get({ apiName, path: '/items' }).response,
          get({ apiName, path: '/Customers' }).response
        ]);
        const productsData = await productsRes.body.json();
        const customersData = await customersRes.body.json();
        setProducts(productsData);
        setCustomers(customersData);

        if (isEditMode && documentId) {
          const { body } = await get({ apiName, path: `/documents/${documentId}` }).response;
          const docToEdit = await body.json();
          if (!docToEdit || docToEdit.status !== 'Unpaid' || docToEdit.documentType !== 'Bill') {
            toast({ title: "Not Editable", status: "warning", duration: 5000 }); navigate('/documents'); return;
          }
          setFormType(docToEdit.documentType);
          setPaymentTerms(docToEdit.paymentTerms);
          setSelectedCustomerOption({ value: docToEdit.customerId, label: `${docToEdit.customerName} (${customersData.find(c=>c.customerId===docToEdit.customerId)?.phone})` });
          setNotes(docToEdit.notes);
          setFormItems(docToEdit.items.map(item => ({...item, lineTotal: (item.price || 0) * (item.quantity || 0)})));
        } else {
            const { body } = await get({apiName, path:'/documents', options: { queryParams: { recent: 'true' } } }).response;
            setRecentDocuments(await body.json());
        }
      } catch (error) {
        toast({ title: "Error", description: "Could not load data for the form.", status: "error" });
      } finally { setIsLoading(false); }
    };
    fetchInitialData();
  }, [documentId, isEditMode, apiName, navigate, toast]);

  const handleCustomerSelectChange = (selectedOption, { action }) => { if (action === 'create-option') { setNewCustomerInputValue(selectedOption.value); openCustomerModal(); } else { setSelectedCustomerOption(selectedOption); } };
  const handleSaveNewCustomer = async (customerFormData) => { setIsSubmittingCustomer(true); try { const { body } = await post({apiName,path:'/Customers',options:{body:customerFormData}}).response; const savedCustomer=await body.json(); toast({title:"Customer Added",status:"success"}); closeCustomerModal(); const newOption={value:savedCustomer.customerId,label:`${savedCustomer.name} (${savedCustomer.phone})`}; setCustomers(prev=>[...prev,savedCustomer]); setSelectedCustomerOption(newOption); } catch(err){ toast({title:"Failed to Add Customer",status:"error"}); } finally{ setIsSubmittingCustomer(false); } };
  
  const handleSaveDocument = async (e) => {
    e.preventDefault();
    const validItems = formItems.filter(item => item.productId && item.quantity > 0);
    if (!selectedCustomerOption || validItems.length === 0) { setFormError("Customer and at least one item are required."); return; }
    
    const payload = { type: formType, customerId: selectedCustomerOption.value, customerName: selectedCustomerOption.label.split(' (')[0], notes, items: validItems, paymentTerms: formType === 'Bill' ? paymentTerms : null };
    
    setIsSubmitting(true);
    try {
      if (isEditMode) {
        await put({ apiName, path: `/documents/${documentId}`, options: { body: payload } });
        toast({ title: "Bill Updated!", status: "success" });
        navigate('/documents');
      } else {
        await post({ apiName, path: '/documents', options: { body: payload } });
        toast({ title: "Document Created!", status: "success" });
        resetForm();
        const { body } = await get({apiName, path:'/documents', options: { queryParams: { recent: 'true' } } }).response;
        setRecentDocuments(await body.json());
      }
    } catch (error) {
      const errorMsg = (error.response && await error.response.body.json().error) || 'An error occurred.';
      setFormError(errorMsg); toast({ title: "Save Failed", description: errorMsg, status: "error" });
    } finally { setIsSubmitting(false); }
  };
  
  if (isLoading) return <Spinner size="xl" />;

  return (
    <Container maxW="container.xl" py={8}>
      <Box bg="white" p={6} rounded="md" shadow="md">
        <Flex justify="space-between" align="center" mb={6}>
          <Heading size="lg">{isEditMode ? `Edit Bill #${documentId?.substring(0,8)}...` : 'New Quote / Bill'}</Heading>
          <Button onClick={() => navigate(isEditMode ? '/documents' : '/')} variant="outline">{isEditMode ? 'Back to Documents' : 'Back to Dashboard'}</Button>
        </Flex>
        <Box border="1px" borderColor="gray.200" p={5} borderRadius="md" mb={8}>
          <form onSubmit={handleSaveDocument}>
            <VStack spacing={4} align="stretch">
              <HStack spacing={4}>
                <FormControl isReadOnly={isEditMode}><FormLabel>Document Type</FormLabel><ChakraSelect value={formType} onChange={(e) => setFormType(e.target.value)} isDisabled={isEditMode}><option value="Quotation">Quotation</option><option value="Bill">Bill</option></ChakraSelect></FormControl>
                {formType === 'Bill' && <FormControl isReadOnly={isEditMode}><FormLabel>Payment Terms</FormLabel><ChakraSelect value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} isDisabled={isEditMode}><option value="Pay in Full">Pay in Full (Cash Sale)</option><option value="Pay in Installments">Pay in Installments (Credit Sale)</option></ChakraSelect></FormControl>}
              </HStack>
              <FormControl isRequired isReadOnly={isEditMode}><FormLabel>Customer</FormLabel><CreatableSelect isClearable isDisabled={isEditMode} options={customers.map(c=>({value:c.customerId, label:`${c.name} (${c.phone})`}))} value={selectedCustomerOption} onChange={handleCustomerSelectChange} onCreateOption={(val) => handleCustomerSelectChange({value:val, label:val}, {action: 'create-option'})} onInputChange={setNewCustomerInputValue} inputValue={newCustomerInputValue} placeholder="Select or type to add..."/></FormControl>
              <Text fontWeight="medium" mt={2}>Items:</Text>
              {formItems.map((item, index) => (
                <SimpleGrid key={index} columns={{ base: 1, md: 5 }} spacing={3} alignItems="center">
                  <FormControl gridColumn={{ base: 'span 1', md: 'span 2' }}>{index === 0 && <FormLabel>Product</FormLabel>}<ChakraSelect placeholder="Select product" size="sm" value={item.productId} onChange={(e) => handleItemChange(index, 'productId', e.target.value)}><option value="" disabled>Select...</option>{products.map(p => <option key={p.productId} value={p.productId}>{p.name} (Stock: {p.quantity ?? 0})</option>)}</ChakraSelect></FormControl>
                  <FormControl>{index === 0 && <FormLabel>Qty</FormLabel>}<Input type="number" placeholder="Qty" size="sm" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} /></FormControl>
                  <FormControl>{index === 0 && <FormLabel>Unit Price</FormLabel>}<Input type="number" size="sm" isReadOnly value={item.price || 0} /></FormControl>
                  <HStack justifySelf="flex-end" alignSelf="flex-end" pb={index > 0 ? '24px' : 0} w="full"><Text fontSize="sm" fontWeight="bold" mr={2} minW="80px" textAlign="right">₹{(item.lineTotal || 0).toFixed(2)}</Text>{formItems.length > 1 && (<IconButton size="xs" variant="ghost" colorScheme="red" icon={<span>×</span>} onClick={() => removeItemLine(index)} aria-label="Remove Item" />)}</HStack>
                </SimpleGrid>
              ))}
              <Button onClick={addItemLine} size="sm" variant="outline" colorScheme="blue" alignSelf="flex-start">+ Add Item</Button>
              <Flex justify="flex-end" mt={2} fontWeight="bold" fontSize="lg" borderTop="1px" borderColor="gray.200" pt={3}><Text mr={4}>Grand Total:</Text><Text>₹{(calculateGrandTotal() || 0).toFixed(2)}</Text></Flex>
              <FormControl><FormLabel>Notes / Terms</FormLabel><Textarea placeholder="Optional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} /></FormControl>
              <HStack justify="flex-end" spacing={4}>
                <Button variant="ghost" onClick={isEditMode ? () => navigate('/documents') : resetForm} isLoading={isSubmitting}>Cancel</Button>
                <Button type="submit" colorScheme="teal" isLoading={isSubmitting} loadingText="Saving...">
                  {isEditMode ? 'Save Changes' : (formType === 'Quotation' ? 'Save Quotation' : (paymentTerms === 'Pay in Full' ? 'Save & Finalize Bill' : 'Save Bill on Credit'))}
                </Button>
              </HStack>
            </VStack>
          </form>
        </Box>
        {!isEditMode && <>
          <Divider my={8} />
          <Heading size="md" mb={4}>Recent Documents</Heading>
          {recentDocuments.length > 0 ? (
            <TableContainer border="1px" borderColor="gray.100" borderRadius="md">
              <Table variant='simple' size="sm">
                <Thead bg="gray.50"><Tr><Th>ID</Th><Th>Type</Th><Th>Customer</Th><Th>Status</Th><Th isNumeric>Total</Th></Tr></Thead>
                <Tbody>{recentDocuments.map(q => (<Tr key={q.documentId}><Td>{q.documentId.substring(0, 8)}...</Td><Td><Tag colorScheme={q.documentType === 'Bill' ? 'orange' : 'blue'}>{q.documentType}</Tag></Td><Td>{q.customerName}</Td><Td><Tag colorScheme={q.status === 'Paid' ? 'green' : 'red'}>{q.status}</Tag></Td><Td isNumeric>₹{(q.grandTotal || 0).toFixed(2)}</Td></Tr>))}</Tbody>
              </Table>
            </TableContainer>
          ) : <Text>No recent documents.</Text>}
        </>}
        <Modal isOpen={isCustomerModalOpen} onClose={closeCustomerModal} size="xl" isCentered><ModalOverlay /><ModalContent><ModalHeader>Add New Customer</ModalHeader><ModalCloseButton /><ModalBody pb={6}><CustomerForm initialData={{ name: newCustomerInputValue }} onSubmit={handleSaveNewCustomer} onCancel={closeCustomerModal} isSubmitting={isSubmittingCustomer} /></ModalBody></ModalContent></Modal>
      </Box>
    </Container>
  );
}
export default Quotations;