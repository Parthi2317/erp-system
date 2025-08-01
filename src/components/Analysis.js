// src/components/Analysis.js
// Placeholder for Analysis Features - Corrected Missing Imports

import React, { useState, useEffect, useCallback, useMemo } from 'react'; // <-- Import useMemo
import { useNavigate } from 'react-router-dom';
// import { get } from 'aws-amplify/api'; // Import when API is ready
import {
  Box, Heading, Text, Button, Container, Flex, useToast, Spinner,
  SimpleGrid, Stat, StatLabel, StatNumber, StatHelpText, StatGroup,
  FormControl, FormLabel, Input,
  HStack, // <-- Import HStack
  Alert, AlertIcon // <-- Import Alert, AlertIcon
} from '@chakra-ui/react';
// import { Line, Bar } from 'react-chartjs-2'; // Example Charting Library
// import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js'; // Chart.js setup
// ChartJS.register( CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend ); // Register Chart.js components

const API_NAME = 'inventoryApi'; // Reuse API name
const SALES_SUMMARY_PATH = '/analysis/sales-summary';
const PRODUCT_SALES_PATH = '/analysis/product-sales';

function Analysis() {
    const navigate = useNavigate();
    const toast = useToast();

    // State
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("Analysis feature backend not implemented."); // Default message
    const [salesSummary, setSalesSummary] = useState({ daily: [], monthly: [] }); // { date: '...', total: X }, { month: 'YYYY-MM', total: Y }
    const [productSales, setProductSales] = useState([]); // { productId: '...', productName: '...', totalQuantity: X }

    // Filters
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(firstDayOfMonth);
    const [endDate, setEndDate] = useState(lastDayOfMonth);

    // --- Fetch Analysis Data ---
    const fetchData = useCallback(async () => {
        console.log(`Analysis: Fetching data for ${startDate} to ${endDate}`);
        setIsLoading(true); setError("Analysis feature backend not implemented."); // Reset error
        setSalesSummary({ daily: [], monthly: [] }); // Clear previous data
        setProductSales([]);

        // *** NOTE: Backend API calls are commented out until implemented ***
        setIsLoading(false); // Remove this when API calls are active
        return; // Remove this when API calls are active

        /* // --- Uncomment when backend is ready ---
        try {
            const queryParams = { startDate, endDate };

            // Fetch Sales Summary
            console.log(`Analysis: GET ${SALES_SUMMARY_PATH}`);
            const summaryOp = get({ apiName: API_NAME, path: SALES_SUMMARY_PATH, options: { queryParams } });
            const summaryRes = await summaryOp.response;
            if (summaryRes.statusCode === 200 && summaryRes.body) {
                 const summaryData = await summaryRes.body.json();
                 setSalesSummary(summaryData || { daily: [], monthly: [] });
                 console.log("Sales Summary OK:", summaryData);
            } else { throw new Error(`Sales Summary API fail: ${summaryRes.statusCode}`); }

             // Fetch Product Sales
            console.log(`Analysis: GET ${PRODUCT_SALES_PATH}`);
            const productOp = get({ apiName: API_NAME, path: PRODUCT_SALES_PATH, options: { queryParams } });
            const productRes = await productOp.response;
            if (productRes.statusCode === 200 && productRes.body) {
                 const productData = await productRes.body.json();
                 if (!Array.isArray(productData)) throw new Error('Prd Sales !arr');
                 setProductSales(productData); // Expects sorted list from backend
                 console.log("Product Sales OK:", productData);
            } else { throw new Error(`Product Sales API fail: ${productRes.statusCode}`); }

            setError(null); // Clear error on full success

        } catch (err) {
            console.error("Analysis: Error fetching data:", err);
            setError(err.message || 'Failed to load analysis data.');
            setSalesSummary({ daily: [], monthly: [] });
            setProductSales([]);
        } finally {
            setIsLoading(false);
        }
        */ // --- End Uncomment Block ---

    }, [startDate, endDate]); // Add API_NAME and paths if needed

    // Fetch data when date range changes
    useEffect(() => {
        if (startDate && endDate) {
            fetchData();
        }
    }, [startDate, endDate, fetchData]);

    // --- Chart Data Preparation (Example for Chart.js) ---
    // These useMemo hooks are safe even if data is empty
    const monthlySalesChartData = useMemo(() => ({
        labels: salesSummary.monthly.map(m => m.month),
        datasets: [{
            label: 'Monthly Income (INR)', data: salesSummary.monthly.map(m => m.total),
            borderColor: 'rgb(75, 192, 192)', backgroundColor: 'rgba(75, 192, 192, 0.5)', tension: 0.1
        }]
    }), [salesSummary.monthly]);

     const topProductChartData = useMemo(() => {
         const topN = 10; // Show top 10 products
         const labels = productSales.slice(0, topN).map(p => p.productName);
         const data = productSales.slice(0, topN).map(p => p.totalQuantity);
         return {
             labels,
             datasets: [{
                 label: 'Quantity Sold', data,
                 backgroundColor: 'rgba(153, 102, 255, 0.6)', borderColor: 'rgb(153, 102, 255)', borderWidth: 1
             }]
         };
     }, [productSales]);

    // --- Render Logic ---
    return (
        <Container maxW="container.xl" py={8}>
             <Box bg="white" p={6} rounded="md" shadow="md">
                {/* Header */}
                <Flex justify="space-between" align="center" mb={6}>
                    <Heading size="lg">Sales & Product Analysis</Heading>
                    <Button onClick={() => navigate('/')} variant="outline">Dashboard</Button>
                </Flex>

                {/* Date Filters */}
                <HStack spacing={4} mb={6}>
                    <FormControl> <FormLabel fontSize="sm">Start Date</FormLabel> <Input type="date" size="sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} /> </FormControl>
                    <FormControl> <FormLabel fontSize="sm">End Date</FormLabel> <Input type="date" size="sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} /> </FormControl>
                </HStack>

                 {/* Error Alert */}
                 {error && ( <Alert status='error' variant='subtle' borderRadius="md" mb={6}> <AlertIcon /> {error} </Alert> )}
                 {/* Loading Indicator */}
                 {isLoading && <Flex justify="center" py={10}><Spinner size="xl" color="purple.500" /></Flex>}

                 {!isLoading && !error && (
                     <SimpleGrid columns={{ base: 1, md: 2 }} spacing={10}>
                         {/* Monthly Sales Chart/Data */}
                         <Box>
                             <Heading size="md" mb={4}>Monthly Sales Trend</Heading>
                             {salesSummary.monthly.length > 0 ? (
                                 <Text>Chart placeholder for Monthly Sales</Text>
                                 /* <Line options={{ responsive: true }} data={monthlySalesChartData} /> */ // Uncomment when chart library installed
                             ) : <Text>No monthly sales data for selected period.</Text>}
                         </Box>

                         {/* Top Products Chart/Data */}
                          <Box>
                             <Heading size="md" mb={4}>Top Selling Products (by Quantity)</Heading>
                             {productSales.length > 0 ? (
                                  <Text>Chart placeholder for Top Products</Text>
                                 /* <Bar options={{ responsive: true, indexAxis: 'y' }} data={topProductChartData} /> */ // Uncomment when chart library installed
                             ) : <Text>No product sales data for selected period.</Text>}
                         </Box>
                     </SimpleGrid>
                 )}
            </Box>
        </Container>
    );
}
export default Analysis;