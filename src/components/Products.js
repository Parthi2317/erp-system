// src/components/Products.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, post, put, del } from 'aws-amplify/api';
// import { getCurrentUser } from 'aws-amplify/auth'; // Not used here
// import webSocketService from '../services/WebSocketService'; // <-- WebSocket Disabled

// --- Reusable Helper Components ---
// (Include the SimpleModal and ProductForm component definitions here as provided before)
const SimpleModal = ({ isOpen, onClose, title, children }) => { if (!isOpen) return null; return ( <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}> <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', minWidth: '300px', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}> <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}> <h3 style={{ margin: 0, fontSize: '1.5rem' }}>{title}</h3> <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', padding: '0 0.5rem' }}>×</button> </div> {children} </div> </div> ); };
const ProductForm = ({ initialData = { name: '', price: '', quantity: '' }, onSubmit, onCancel, isSubmitting }) => { const [formData, setFormData] = useState(initialData); useEffect(() => { setFormData(initialData); }, [initialData]); const handleChange = (e) => { const { name, value, type } = e.target; setFormData(prev => ({ ...prev, [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value })); }; const handleSubmit = (e) => { e.preventDefault(); console.log("ProductForm submitting:", formData); onSubmit(formData); }; return ( <form onSubmit={handleSubmit}> <div style={{ marginBottom: '1rem' }}><label style={{ display: 'block', marginBottom: '0.25rem' }}>Name:</label><input type="text" name="name" value={formData.name} onChange={handleChange} required style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }} /></div> <div style={{ marginBottom: '1rem' }}><label style={{ display: 'block', marginBottom: '0.25rem' }}>Price:</label><input type="number" name="price" value={formData.price} onChange={handleChange} required step="0.01" min="0" style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }} /></div> <div style={{ marginBottom: '1rem' }}><label style={{ display: 'block', marginBottom: '0.25rem' }}>Quantity:</label><input type="number" name="quantity" value={formData.quantity} onChange={handleChange} required step="1" min="0" style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }} /></div> <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}><button type="button" onClick={onCancel} disabled={isSubmitting} style={{ padding: '0.5rem 1rem', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px' }}>Cancel</button><button type="submit" disabled={isSubmitting} style={{ padding: '0.5rem 1rem', cursor: 'pointer', backgroundColor: isSubmitting ? '#ccc' : '#4CAF50', color: 'white', border: 'none', borderRadius: '4px' }}> {isSubmitting ? 'Saving...' : 'Save'} </button></div> </form> ); };
const EMPTY_PRODUCT_FORM = { name: '', price: '', quantity: '' };

// --- Main Products Component ---
function Products() {
    const navigate = useNavigate(); // Called inside component body
    console.log("Products: Component rendered.");

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const apiName = 'inventoryApi'; // Confirmed API Name

    // --- API/Data Fetching ---
    const fetchProducts = useCallback(async () => {
        console.log("Products: fetchProducts called");
        setLoading(true); setError(null);
        try {
            console.log(`Products: Attempting GET ${apiName}/items`);
            const restOperation = get({ apiName, path: '/items' }); // Correct Path
            const response = await restOperation.response;
            console.log("Products: GET /items status:", response.statusCode);
            if (response.statusCode >= 200 && response.statusCode < 300 && response.body) {
                 const parsedBody = await response.body.json();
                 if (Array.isArray(parsedBody)) {
                    console.log("Products: Fetched products OK:", parsedBody.length);
                    setProducts(parsedBody); // Expects items with productId
                 } else { throw new Error('API response not an array'); }
            } else {
                let errM =`API GET failed: ${response.statusCode}`; try {const eB=await response.body.text(); errM+=` - ${eB.substring(0,100)}`;} catch(e){}
                console.error("Products: Fetch failed:", errM); throw new Error(errM); }
        } catch (err) { console.error("Products: Error in fetchProducts:", err); setError(err.message || 'Failed to load products'); setProducts([]); }
        finally { console.log("Products: fetchProducts finished"); setLoading(false); }
    }, []); // apiName is stable

    // --- WebSocket (DISABLED) ---
    // const handleProductUpdate = useCallback(/* ... */, []);

    // --- Effects ---
    useEffect(() => {
        console.log("Products: useEffect running");
        fetchProducts();
        // --- WebSocket Disabled ---
    }, [fetchProducts]); // Only fetchProducts needed now

    // --- Modal Handlers ---
    const openAddModal = () => setIsAddModalOpen(true);
    const closeAddModal = () => setIsAddModalOpen(false);
    const openEditModal = (product) => { console.log("Products: Opening edit modal for:", product); setEditingProduct(product); setIsEditModalOpen(true); };
    const closeEditModal = () => { setIsEditModalOpen(false); setEditingProduct(null); };

    // --- API Action Handlers ---
    const handleAddProduct = async (productData) => {
        console.log("Products: handleAddProduct called:", productData);
        setIsSubmitting(true); setError(null);
        try {
             console.log(`Products: Attempting POST ${apiName}/items`);
             const op = post({ apiName, path: '/items', options: { body: productData } });
             const res = await op.response;
             console.log("Products: POST /items status:", res.statusCode);
             if (res.statusCode >= 201 && res.statusCode < 300) {
                 const body = await res.body.json(); console.log("Products: Add successful:", body);
                 closeAddModal(); fetchProducts();
             } else { let eMsg=`Add failed: ${res.statusCode}`; try{const b=await res.body.json();eMsg+=` ${b?.error||b?.message||''}`}catch(e){} throw new Error(eMsg); }
        } catch (err) { console.error("Products: Error handleAddProduct:", err); setError(err.message || "Failed add."); }
        finally { console.log("Products: handleAddProduct finished"); setIsSubmitting(false); }
    };

    const handleEditProduct = async (productData) => {
        console.log("Products: handleEditProduct called:", productData);
        if (!editingProduct?.productId) { console.error("Edit failed: No product selected"); setError("No product selected for edit."); return; }
        setIsSubmitting(true); setError(null);
        const id = editingProduct.productId; // This is the actual productId (UUID)
        const pathId = id; // Since API Gateway path is /items/{itemId}, we pass the productId value here
        try {
            console.log(`Products: Attempting PUT ${apiName}/items/${pathId}`);
            const op = put({ apiName, path: `/items/${pathId}`, options: { body: productData } });
            const res = await op.response;
            console.log(`Products: PUT /items/${pathId} status:`, res.statusCode);
             if (res.statusCode >= 200 && res.statusCode < 300) {
                const body = await res.body.json(); console.log("Products: Update successful:", body);
                closeEditModal(); fetchProducts();
             } else { let eMsg=`Update failed: ${res.statusCode}`; try{const b=await res.body.json();eMsg+=` ${b?.error||b?.message||''}`}catch(e){} throw new Error(eMsg); }
        } catch (err) { console.error("Products: Error handleEditProduct:", err); setError(err.message || "Failed update."); }
        finally { console.log("Products: handleEditProduct finished"); setIsSubmitting(false); }
    };

    const handleDeleteProduct = async (productIdToDelete) => {
        console.log("Products: handleDeleteProduct called for ID:", productIdToDelete);
        if (!productIdToDelete) { console.error("Delete failed: No productId"); setError("No ID provided for delete."); return; }
        if (!window.confirm(`Delete product ID ${productIdToDelete}?`)) { console.log("Delete cancelled."); return; }
        setError(null);
        const pathId = productIdToDelete; // Use productId in the path for {itemId} param
        try {
            console.log(`Products: Attempting DELETE ${apiName}/items/${pathId}`);
            const op = del({ apiName, path: `/items/${pathId}` });
            const res = await op.response;
            console.log(`Products: DELETE /items/${pathId} status:`, res.statusCode);
             if (res.statusCode === 204 || (res.statusCode >= 200 && res.statusCode < 300)) {
                 console.log(`Delete successful for ID: ${productIdToDelete}`);
                 fetchProducts();
             } else { let eMsg=`Delete failed: ${res.statusCode}`; try{const b=await res.body.json();eMsg+=` ${b?.error||b?.message||''}`}catch(e){} throw new Error(eMsg); }
        } catch (err) { console.error("Products: Error handleDeleteProduct:", err); setError(err.message || "Failed delete."); }
        finally { console.log("Products: handleDeleteProduct finished"); }
    };

    // --- Other User Actions ---
    const goToDashboard = () => { console.log("Products: Navigating to Dashboard..."); navigate('/'); };

    // --- Render Logic ---
    // Using Tailwind classes - assuming structure is okay
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-100 via-blue-50 to-purple-100 py-10 px-4 flex flex-col items-center">
            {/* Add/Edit Modals */}
            <SimpleModal isOpen={isAddModalOpen} onClose={closeAddModal} title="Add New Product"><ProductForm initialData={EMPTY_PRODUCT_FORM} onSubmit={handleAddProduct} onCancel={closeAddModal} isSubmitting={isSubmitting} /></SimpleModal>
            <SimpleModal isOpen={isEditModalOpen} onClose={closeEditModal} title={`Edit Product (ID: ${editingProduct?.productId})`}>{editingProduct && (<ProductForm initialData={{ name: editingProduct.name, price: editingProduct.price, quantity: editingProduct.quantity }} onSubmit={handleEditProduct} onCancel={closeEditModal} isSubmitting={isSubmitting} />)}</SimpleModal>

            {/* Main Content Area */}
            <div className="w-full max-w-6xl bg-white rounded-2xl shadow-xl p-6 md:p-8">
                {/* Header */}
                 <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 truncate">Product Management</h1>
                    <div className="flex flex-wrap gap-3 justify-center">
                        <button data-testid="add-button" onClick={openAddModal} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg shadow transition duration-150 ease-in-out"> + Add Product </button>
                        <button onClick={goToDashboard} className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg shadow transition duration-150 ease-in-out"> Dashboard </button>
                    </div>
                 </div>
                {/* Title */}
                <h2 className="text-2xl font-semibold text-blue-700 mb-4">📦 Product List</h2>
                {/* Loading/Error */}
                {loading && !isSubmitting && ( <div className="text-center py-10 text-gray-500"> {/* ... spinner ... */} Loading products... </div> )}
                {error && ( <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert"> <strong className="font-bold">Error:</strong> <span className="block sm:inline ml-2">{error}</span> <button onClick={() => setError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3" aria-label="Close"><span className="text-xl">×</span></button> </div> )}
                {/* Product Table */}
                {!loading && (
                <div className="overflow-x-auto rounded-lg shadow border border-gray-200">
                    <table className="min-w-full table-auto text-sm text-left">
                        <thead className="bg-gradient-to-r from-blue-100 to-indigo-100 text-gray-700 uppercase text-xs tracking-wider"><tr>
                            <th className="px-5 py-3 border-b-2 border-gray-300">Product ID</th>
                            <th className="px-5 py-3 border-b-2 border-gray-300">Name</th>
                            <th className="px-5 py-3 border-b-2 border-gray-300 text-right">Price</th>
                            <th className="px-5 py-3 border-b-2 border-gray-300 text-right">Quantity</th>
                            <th className="px-5 py-3 border-b-2 border-gray-300 text-center">Actions</th>
                        </tr></thead>
                        <tbody className="bg-white divide-y divide-gray-200">{
                            products.length > 0 ? (
                                products.map((p) => (
                                    // Use productId consistently
                                    <tr key={p.productId} className="hover:bg-gray-50 transition duration-150 ease-in-out">
                                        <td className="px-5 py-3 whitespace-nowrap font-medium text-gray-600" title={p.productId}>{p.productId.substring(0, 8)}...</td>{/* Shorten display */}
                                        <td className="px-5 py-3 whitespace-nowrap text-gray-900">{p.name}</td>
                                        <td className="px-5 py-3 whitespace-nowrap text-right text-gray-700">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(p.price || 0)}</td>
                                        <td className="px-5 py-3 whitespace-nowrap text-right font-medium"><span className={p.quantity <= 10 ? 'text-red-600' : 'text-green-600'}> {p.quantity ?? 0} </span></td>
                                        <td className="px-5 py-3 whitespace-nowrap text-center text-sm font-medium">
                                            <button data-testid={`edit-${p.productId}`} onClick={() => openEditModal(p)} className="text-indigo-600 hover:text-indigo-900 mr-3" aria-label={`Edit ${p.name}`}> Edit </button>
                                            <button data-testid={`delete-${p.productId}`} onClick={() => handleDeleteProduct(p.productId)} className="text-red-600 hover:text-red-900" aria-label={`Delete ${p.name}`}> Delete </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="5" className="text-center py-6 text-gray-500"> No products found. Add one! </td></tr>
                            )
                        }</tbody>
                    </table>
                </div>
                )}
            </div>
        </div>
    );
}
export default Products;