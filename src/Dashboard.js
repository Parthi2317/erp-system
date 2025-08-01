// src/Dashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, signOut } from 'aws-amplify/auth';
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  HStack,
  Spacer,
  Container,
  Spinner,
  Alert,
  AlertIcon
} from '@chakra-ui/react';

function Dashboard() {
    const [username, setUsername] = useState('');
    const [isLoadingUser, setIsLoadingUser] = useState(true);
    const [userError, setUserError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
      async function fetchUser() {
        setIsLoadingUser(true);
        setUserError(null);
        try {
          const { username: cognitoUsername, signInDetails } = await getCurrentUser();
          const userIdentifier = signInDetails?.loginId || cognitoUsername || 'User';
          setUsername(userIdentifier);
        } catch (error) {
          console.error('Dashboard: Error fetching user:', error);
          setUserError("Could not fetch user details.");
          setUsername('Error');
        } finally {
          setIsLoadingUser(false);
        }
      }
      fetchUser();
    }, []);

    const handleSignOut = async () => {
        try {
            await signOut({ global: true });
        } catch (error) {
            console.error('Dashboard: Error during signOut: ', error);
        }
    };

    return (
        <Box minH="100vh" bg="gray.50">

          {/* Top Navigation Bar */}
          <Flex
            as="header"
            bg="teal.600"
            color="white"
            px={{ base: 4, md: 6 }}
            py={3}
            align="center"
            boxShadow="sm"
          >
            <Heading size="md">Inventory & Billing System</Heading>
            <Spacer />
            <HStack spacing={4}>
              {isLoadingUser ? (
                <Spinner size="sm" color="whiteAlpha.800" />
              ) : (
                <Text fontSize="sm">Welcome, <Text as="span" fontWeight="semibold">{username}</Text></Text>
              )}
              <Button
                data-testid="signout-button"
                size="sm"
                colorScheme="red"
                variant="solid"
                onClick={handleSignOut}
              >
                Sign Out
              </Button>
            </HStack>
          </Flex>

          {/* Main Dashboard Content Area */}
          <Container maxW="container.lg" py={8}>
            <Heading as="h1" size="lg" mb={6} textAlign="center" color="gray.700">
              Dashboard
            </Heading>

            {userError && (
                 <Alert status='error' variant='subtle' borderRadius="md" mb={6}>
                    <AlertIcon />
                    {userError}
                 </Alert>
            )}

            {/* Grid for Navigation Cards */}
            <Flex wrap="wrap" gap={6} justify="center">

              {/* Product Management Card */}
              <Box w={{ base: '90%', sm: '280px', md: '300px' }} p={5} bg="white" borderRadius="xl" boxShadow="lg" _hover={{ boxShadow: 'xl', transform: 'translateY(-2px)' }} transition="all 0.2s ease-out">
                <Heading size="md" mb={3} color="gray.800"> 📦 Products </Heading>
                <Text fontSize="sm" color="gray.600" mb={4} minH="40px"> Add, view, edit, and delete product listings. </Text>
                <Button data-testid="products-button" colorScheme="teal" variant="solid" w="full" onClick={() => navigate('/products')}> Manage Products </Button>
              </Box>
              
              {/* Inventory View Card */}
              <Box w={{ base: '90%', sm: '280px', md: '300px' }} p={5} bg="white" borderRadius="xl" boxShadow="lg" _hover={{ boxShadow: 'xl', transform: 'translateY(-2px)' }} transition="all 0.2s ease-out">
                 <Heading size="md" mb={3} color="gray.800"> 📊 Inventory Levels </Heading>
                 <Text fontSize="sm" color="gray.600" mb={4} minH="40px"> View current stock quantities and identify items needing refill. </Text>
                 <Button data-testid="inventory-button" colorScheme="teal" variant="solid" w="full" onClick={() => navigate('/inventory')}> View Inventory </Button>
              </Box>

               {/* Customer Management Card */}
               <Box w={{ base: '90%', sm: '280px', md: '300px' }} p={5} bg="white" borderRadius="xl" boxShadow="lg" _hover={{ boxShadow: 'xl', transform: 'translateY(-2px)' }} transition="all 0.2s ease-out">
                   <Heading size="md" mb={3} color="gray.800">👥 Customers</Heading>
                   <Text fontSize="sm" color="gray.600" mb={4} minH="40px">Add, view, edit, or delete customer details.</Text>
                   <Button data-testid="customers-button" colorScheme="purple" variant="solid" w="full" onClick={() => navigate('/customers')}>Manage Customers</Button>
                </Box>
                
              {/* Quotations/Billing Card */}
              <Box w={{ base: '90%', sm: '280px', md: '300px' }} p={5} bg="white" borderRadius="xl" boxShadow="lg" _hover={{ boxShadow: 'xl', transform: 'translateY(-2px)' }} transition="all 0.2s ease-out">
                 <Heading size="md" mb={3} color="gray.800"> 📝 New Quote / Bill </Heading>
                 <Text fontSize="sm" color="gray.600" mb={4} minH="40px"> Create new quotations and bills for customers. </Text>
                 <Button data-testid="quotations-button" colorScheme="teal" variant="solid" w="full" onClick={() => navigate('/quotations')}> Create Documents </Button>
              </Box>

              {/* **** MODIFIED CARD FOR VIEWING DOCUMENTS **** */}
              <Box w={{ base: '90%', sm: '280px', md: '300px' }} p={5} bg="white" borderRadius="xl" boxShadow="lg" _hover={{ boxShadow: 'xl', transform: 'translateY(-2px)' }} transition="all 0.2s ease-out">
                  <Heading size="md" mb={3} color="gray.800">📄 View Documents</Heading>
                  <Text fontSize="sm" color="gray.600" mb={4} minH="40px">Search, view, and download existing bills and quotations.</Text>
                  <Button data-testid="documents-button" colorScheme="orange" variant="solid" w="full" onClick={() => navigate('/documents')}>View All Documents</Button>
              </Box>
              {/* **** END OF MODIFIED CARD **** */}

               {/* Ledger Card */}
               <Box w={{ base: '90%', sm: '280px', md: '300px' }} p={5} bg="white" borderRadius="xl" boxShadow="lg" _hover={{ boxShadow: 'xl', transform: 'translateY(-2px)' }} transition="all 0.2s ease-out">
                  <Heading size="md" mb={3} color="gray.800">💰 Ledger</Heading>
                  <Text fontSize="sm" color="gray.600" mb={4} minH="40px">Track income (sales, manual) and expenses.</Text>
                  <Button data-testid="ledger-button" colorScheme="purple" variant="solid" w="full" onClick={() => navigate('/ledger')}>View Ledger</Button>
               </Box>

               {/* Analysis Card */}
               <Box w={{ base: '90%', sm: '280px', md: '300px' }} p={5} bg="white" borderRadius="xl" boxShadow="lg" _hover={{ boxShadow: 'xl', transform: 'translateY(-2px)' }} transition="all 0.2s ease-out">
                  <Heading size="md" mb={3} color="gray.800">📈 Analysis</Heading>
                  <Text fontSize="sm" color="gray.600" mb={4} minH="40px">View sales trends and top-selling products.</Text>
                  <Button data-testid="analysis-button" colorScheme="purple" variant="solid" w="full" onClick={() => navigate('/analysis')}>View Analysis</Button>
               </Box>
               
            </Flex>
          </Container>
        </Box>
      );
}

export default Dashboard;