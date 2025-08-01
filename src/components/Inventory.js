// src/components/Inventory.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { get } from 'aws-amplify/api';
import {
  Box,
  Heading,
  Text,
  Button,
  Container,
  Spinner,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Alert,
  AlertIcon,
  Tag,
  Flex, // <-- ADD Flex HERE
} from '@chakra-ui/react'; // Using Chakra UI components

// Define a threshold for "low stock" indication
const LOW_STOCK_THRESHOLD = 10;

function Inventory() {
  const navigate = useNavigate();
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const apiName = 'inventoryApi'; // Your API Name from aws-exports

  // Fetch ALL products
  const fetchInventoryData = useCallback(async () => {
    console.log("Inventory: fetchInventoryData called");
    setLoading(true); setError(null);
    try {
      console.log(`Inventory: Attempting GET ${apiName}/items`);
      const restOperation = get({ apiName, path: '/items' });
      const response = await restOperation.response;
      console.log("Inventory: GET /items status:", response.statusCode);

      if (response.statusCode >= 200 && response.statusCode < 300 && response.body) {
        const allProducts = await response.body.json();
        if (Array.isArray(allProducts)) {
          console.log("Inventory: Fetched products OK:", allProducts.length);
          // Sort and Prepare Inventory Data
          const sortedInventory = allProducts
            .map(p => ({ productId: p.productId, name: p.name, quantity: p.quantity ?? 0 }))
            .sort((a, b) => a.quantity - b.quantity);
          console.log("Inventory: Sorted data:", sortedInventory.length);
          setInventoryItems(sortedInventory);
        } else { throw new Error('API response not an array'); }
      } else { /* ... error handling ... */ throw new Error(`API GET failed: ${response.statusCode}`); }
    } catch (err) { /* ... error handling ... */ setError(err.message || 'Failed to load inventory data'); setInventoryItems([]); }
    finally { console.log("Inventory: fetchInventoryData finished"); setLoading(false); }
  }, []);

  useEffect(() => {
    console.log("Inventory: useEffect running");
    fetchInventoryData();
  }, [fetchInventoryData]);

  // --- Render Logic ---
  return (
    <Container maxW="container.lg" py={8}>
      <Box bg="white" p={6} rounded="md" shadow="md">
        {/* Use Flex for layout */}
        <Flex justify="space-between" align="center" mb={6}>
          <Heading size="lg">Inventory Stock Levels</Heading>
          <Button onClick={() => navigate('/')} variant="outline">Dashboard</Button>
        </Flex>

        <Text mb={4} color="gray.600">
          Items sorted by lowest quantity first. Items requiring attention (Quantity ≤ {LOW_STOCK_THRESHOLD}) are highlighted.
        </Text>

        {error && ( <Alert status='error' borderRadius="md" mb={4}> <AlertIcon /> Error fetching inventory: {error} </Alert> )}

        {loading ? (
          // Use Flex for loading state layout
          <Flex justify="center" align="center" minH="200px">
            <Spinner size="xl" color="teal.500" />
            <Text ml={4}>Loading Inventory...</Text>
          </Flex>
        ) : (
          <TableContainer border="1px" borderColor="gray.100" borderRadius="md">
            <Table variant='simple' size="md">
              <Thead bg="gray.50">
                <Tr>
                  <Th>Product Name</Th>
                  <Th isNumeric>Current Quantity</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {inventoryItems.length > 0 ? (
                  inventoryItems.map((item) => (
                    <Tr key={item.productId} bg={item.quantity <= LOW_STOCK_THRESHOLD ? 'red.50' : 'white'} >
                      <Td>{item.name}</Td>
                      <Td isNumeric fontWeight="medium">{item.quantity}</Td>
                      <Td>
                        {item.quantity <= 0 && (<Tag size="sm" colorScheme='red'>Out of Stock</Tag>)}
                        {item.quantity > 0 && item.quantity <= LOW_STOCK_THRESHOLD && (<Tag size="sm" colorScheme='orange'>Low Stock</Tag>)}
                        {item.quantity > LOW_STOCK_THRESHOLD && (<Tag size="sm" colorScheme='green'>In Stock</Tag>)}
                      </Td>
                    </Tr>
                  ))
                ) : ( <Tr><Td colSpan={3} textAlign="center" py={6} color="gray.500"> No inventory items found or loaded. </Td></Tr> )}
              </Tbody>
            </Table>
          </TableContainer>
        )}

         <Button mt={6} colorScheme="teal" onClick={() => navigate('/products')}>
             Manage Products (Add/Edit Stock)
         </Button>

      </Box>
    </Container>
  );
}

export default Inventory;