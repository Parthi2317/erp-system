// src/App.js
// --- FINAL CORRECTED VERSION ---
import React from 'react';
import '@aws-amplify/ui-react/styles.css';
import { Routes, Route } from 'react-router-dom';

// --- Component Imports ---
import Dashboard from './Dashboard';
import Products from './components/Products';
import Inventory from './components/Inventory';
import Quotations from './components/Quotations';
import Customers from './components/Customers';
import Ledger from './components/Ledger';
import Analysis from './components/Analysis';
import DocumentsView from './components/DocumentsView';
import Statement from './components/Statement'; // <-- MODIFIED: This is the correct import

function App() {
  return (
    <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/inventory" element={<Inventory />} />

        {/* This route is for creating a new document */}
        <Route path="/quotations" element={<Quotations />} />
        {/* This route is for the "Edit" feature, pre-filling the form */}
        <Route path="/quotations/:documentId" element={<Quotations />} />

        <Route path="/customers" element={<Customers />} />
        <Route path="/ledger" element={<Ledger />} />
        <Route path="/analysis" element={<Analysis />} />
        <Route path="/documents" element={<DocumentsView />} />
        
        {/* --- CORRECTED: Use only the single, correct route for the statement page --- */}
        <Route path="/statement/:customerId" element={<Statement />} />
    </Routes>
  );
}

export default App;