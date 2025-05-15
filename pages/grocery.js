import { useState, useEffect } from 'react';
import { Container, Card, Table, Button, Form, Row, Col, Alert, Tabs, Tab, Spinner, Modal } from 'react-bootstrap';
import Navbar from '../components/Navbar';
import Head from 'next/head';

const UNIT_OPTIONS = ['kg', 'g', 'L', 'ml', 'pcs', 'pack', 'dozen', 'other'];

export default function GroceryPage() {
  // Grocery stock state
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsError, setItemsError] = useState('');
  const [newItem, setNewItem] = useState({ name: '', quantity: '', unit: '', minStock: '', note: '' });
  const [editIndex, setEditIndex] = useState(null);
  const [editItem, setEditItem] = useState({});
  const [tab, setTab] = useState('stock');

  // Sabha usage state
  const [sabhaRecords, setSabhaRecords] = useState([]);
  const [sabhaLoading, setSabhaLoading] = useState(true);
  const [sabhaError, setSabhaError] = useState('');
  const [newSabha, setNewSabha] = useState({ date: '', menu: '', groceriesUsed: [] });
  const [sabhaGrocery, setSabhaGrocery] = useState({ name: '', quantity: '', unit: '' });
  const [sabhaDeleteLoading, setSabhaDeleteLoading] = useState(null);

  // Modal state for adding new item
  const [showAddModal, setShowAddModal] = useState(false);
  const handleOpenAddModal = () => setShowAddModal(true);
  const handleCloseAddModal = () => setShowAddModal(false);

  // Fetch grocery items from API
  useEffect(() => {
    setItemsLoading(true);
    setItemsError('');
    fetch('/api/grocery')
      .then(res => res.json())
      .then(data => {
        setItems(data.items || []);
        setItemsLoading(false);
      })
      .catch(err => {
        setItemsError('Failed to load grocery items');
        setItemsLoading(false);
      });
  }, []);

  // Fetch sabha records from API
  useEffect(() => {
    setSabhaLoading(true);
    setSabhaError('');
    fetch('/api/sabha-grocery')
      .then(res => res.json())
      .then(data => {
        setSabhaRecords(data.records || []);
        setSabhaLoading(false);
      })
      .catch(err => {
        setSabhaError('Failed to load sabha records');
        setSabhaLoading(false);
      });
  }, []);

  // Add new grocery item
  const handleAddItem = async () => {
    if (!newItem.name || !newItem.quantity || !newItem.unit) return;
    try {
      const res = await fetch('/api/grocery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newItem, quantity: Number(newItem.quantity), minStock: Number(newItem.minStock) || 0 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add item');
      setItems([...items, data.item]);
      setNewItem({ name: '', quantity: '', unit: '', minStock: '', note: '' });
    } catch (err) {
      setItemsError(err.message);
    }
  };

  // Edit grocery item
  const handleEditItem = (idx) => {
    setEditIndex(idx);
    setEditItem(items[idx]);
  };
  const handleSaveEdit = async () => {
    try {
      const res = await fetch(`/api/grocery?id=${editItem._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editItem, quantity: Number(editItem.quantity), minStock: Number(editItem.minStock) || 0 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update item');
      const updated = [...items];
      updated[editIndex] = data.item;
      setItems(updated);
      setEditIndex(null);
      setEditItem({});
    } catch (err) {
      setItemsError(err.message);
    }
  };
  const handleDeleteItem = async (idx) => {
    const id = items[idx]._id;
    try {
      const res = await fetch(`/api/grocery?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete item');
      setItems(items.filter((_, i) => i !== idx));
    } catch (err) {
      setItemsError(err.message);
    }
  };
  const handleToggleToBuy = async (idx) => {
    const item = items[idx];
    try {
      const res = await fetch(`/api/grocery?id=${item._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, toBuy: !item.toBuy })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update item');
      const updated = [...items];
      updated[idx] = data.item;
      setItems(updated);
    } catch (err) {
      setItemsError(err.message);
    }
  };

  // Add grocery used in Sabha
  const handleAddSabhaGrocery = () => {
    if (!sabhaGrocery.name || !sabhaGrocery.quantity || !sabhaGrocery.unit) return;
    setNewSabha({
      ...newSabha,
      groceriesUsed: [...(newSabha.groceriesUsed || []), { ...sabhaGrocery, quantity: Number(sabhaGrocery.quantity) }]
    });
    setSabhaGrocery({ name: '', quantity: '', unit: '' });
  };
  // Add Sabha record
  const handleAddSabha = async () => {
    if (!newSabha.date || !newSabha.menu) return;
    try {
      const res = await fetch('/api/sabha-grocery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSabha)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add sabha record');
      setSabhaRecords([data.record, ...sabhaRecords]);
      // Optionally deduct used groceries from stock
      setItems(items.map(item => {
        const used = (newSabha.groceriesUsed || []).find(g => g.name === item.name);
        if (used) {
          return { ...item, quantity: Math.max(0, item.quantity - used.quantity) };
        }
        return item;
      }));
      setNewSabha({ date: '', menu: '', groceriesUsed: [] });
    } catch (err) {
      setSabhaError(err.message);
    }
  };

  // Delete Sabha record
  const handleDeleteSabha = async (id) => {
    setSabhaDeleteLoading(id);
    try {
      const res = await fetch(`/api/sabha-grocery?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete sabha record');
      setSabhaRecords(sabhaRecords.filter((rec) => rec._id !== id));
    } catch (err) {
      setSabhaError(err.message);
    } finally {
      setSabhaDeleteLoading(null);
    }
  };

  // Shopping list: items marked toBuy or below minStock
  const shoppingList = items.filter(item => item.toBuy || (item.minStock && item.quantity <= item.minStock));

  return (
    <>
      <Head>
        <title>Grocery Management - HSAPSS Windsor</title>
      </Head>
      <Navbar />
      <Container className="py-4">
        <h2 className="fw-bold mb-4">Grocery Management</h2>
        <Tabs activeKey={tab} onSelect={setTab} className="mb-4">
          <Tab eventKey="stock" title="Stock">
            <div className="d-flex flex-wrap gap-3 mb-5">
              {itemsLoading ? (
                <div className="w-100 text-center py-4"><Spinner animation="border" /></div>
              ) : itemsError ? (
                <Alert variant="danger" className="w-100">{itemsError}</Alert>
              ) : items.length === 0 ? (
                <Alert variant="info" className="w-100">No items in stock.</Alert>
              ) : (
                items.map((item, idx) => {
                  const isLow = item.minStock && item.quantity <= item.minStock;
                  return (
                    <Card key={item._id} className="grocery-card position-relative flex-grow-1" style={{ minWidth: 260, maxWidth: 340 }}>
                      <Card.Body>
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <Card.Title className="mb-0 fw-bold">{item.name}</Card.Title>
                          <div>
                            <Button size="sm" variant="outline-primary" className="me-1" onClick={() => handleEditItem(idx)} title="Edit"><i className="fas fa-edit"></i></Button>
                            <Button size="sm" variant="outline-danger" onClick={() => handleDeleteItem(idx)} title="Delete"><i className="fas fa-trash"></i></Button>
                          </div>
                        </div>
                        <div className="mb-2">
                          <span className="fs-5 fw-semibold">{item.quantity}</span> <span className="text-muted">{item.unit}</span>
                        </div>
                        <div className="mb-2">
                          <span className="badge bg-secondary me-2">Min: {item.minStock || 0}</span>
                          {item.note && <span className="badge bg-info text-dark">{item.note}</span>}
                        </div>
                        <div className="mb-2">
                          {item.toBuy ? (
                            <span className="badge bg-danger"><i className="fas fa-shopping-cart me-1"></i>To Buy</span>
                          ) : isLow ? (
                            <span className="badge bg-warning text-dark"><i className="fas fa-exclamation-triangle me-1"></i>Low</span>
                          ) : (
                            <span className="badge bg-success"><i className="fas fa-check me-1"></i>In Stock</span>
                          )}
                        </div>
                        <div className="form-check form-switch">
                          <input className="form-check-input" type="checkbox" checked={item.toBuy} onChange={() => handleToggleToBuy(idx)} id={`toBuySwitch${item._id}`} />
                          <label className="form-check-label" htmlFor={`toBuySwitch${item._id}`}>Mark as To Buy</label>
                        </div>
                        {editIndex === idx && (
                          <div className="mt-3">
                            <Form.Group className="mb-2">
                              <Form.Label visuallyHidden>Name</Form.Label>
                              <Form.Control size="sm" value={editItem.name} onChange={e => setEditItem({ ...editItem, name: e.target.value })} />
                            </Form.Group>
                            <Form.Group className="mb-2">
                              <Form.Label visuallyHidden>Quantity</Form.Label>
                              <Form.Control size="sm" type="number" value={editItem.quantity} onChange={e => setEditItem({ ...editItem, quantity: e.target.value })} />
                            </Form.Group>
                            <Form.Group className="mb-2">
                              <Form.Label visuallyHidden>Unit</Form.Label>
                              <Form.Select size="sm" value={editItem.unit} onChange={e => setEditItem({ ...editItem, unit: e.target.value })}>
                                <option value="">Select</option>
                                {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                              </Form.Select>
                            </Form.Group>
                            <Form.Group className="mb-2">
                              <Form.Label visuallyHidden>Min Stock</Form.Label>
                              <Form.Control size="sm" type="number" value={editItem.minStock} onChange={e => setEditItem({ ...editItem, minStock: e.target.value })} />
                            </Form.Group>
                            <Form.Group className="mb-2">
                              <Form.Label visuallyHidden>Note</Form.Label>
                              <Form.Control size="sm" value={editItem.note || ''} onChange={e => setEditItem({ ...editItem, note: e.target.value })} placeholder="e.g. half a 10lb bag left" />
                            </Form.Group>
                            <div className="d-flex gap-2">
                              <Button size="sm" variant="success" onClick={handleSaveEdit} title="Save"><i className="fas fa-check"></i></Button>
                              <Button size="sm" variant="secondary" onClick={() => setEditIndex(null)} title="Cancel"><i className="fas fa-times"></i></Button>
                            </div>
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  );
                })
              )}
            </div>
            {/* Floating Add Button */}
            <Button
              className="position-fixed rounded-circle shadow-lg"
              style={{ right: 32, bottom: 32, width: 60, height: 60, zIndex: 1050, fontSize: 28, display: tab === 'stock' ? 'inline-flex' : 'none', alignItems: 'center', justifyContent: 'center' }}
              variant="success"
              onClick={handleOpenAddModal}
              title="Add New Item"
            >
              <i className="fas fa-plus"></i>
            </Button>
            {/* Add Item Modal */}
            <Modal show={showAddModal} onHide={handleCloseAddModal} centered>
              <Modal.Header closeButton>
                <Modal.Title>Add New Grocery Item</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <Form>
                  <Form.Group className="mb-3">
                    <Form.Label>Name</Form.Label>
                    <Form.Control placeholder="Name" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Quantity</Form.Label>
                    <Form.Control type="number" placeholder="Quantity" value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: e.target.value })} />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Unit</Form.Label>
                    <Form.Select value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })}>
                      <option value="">Unit</option>
                      {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                    </Form.Select>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Min Stock</Form.Label>
                    <Form.Control type="number" placeholder="Min Stock" value={newItem.minStock} onChange={e => setNewItem({ ...newItem, minStock: e.target.value })} />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Note</Form.Label>
                    <Form.Control placeholder="Note (optional)" value={newItem.note || ''} onChange={e => setNewItem({ ...newItem, note: e.target.value })} />
                  </Form.Group>
                </Form>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={handleCloseAddModal}>Cancel</Button>
                <Button variant="success" onClick={() => { handleAddItem(); handleCloseAddModal(); }}>Add</Button>
              </Modal.Footer>
            </Modal>
            <style jsx global>{`
              .grocery-card {
                transition: box-shadow 0.2s;
              }
              .grocery-card:hover {
                box-shadow: 0 4px 24px rgba(0,0,0,0.12);
              }
              @media (max-width: 600px) {
                .grocery-card { min-width: 90vw; max-width: 98vw; }
                .position-fixed[title='Add New Item'] { right: 16px !important; bottom: 16px !important; width: 48px !important; height: 48px !important; font-size: 22px !important; }
              }
            `}</style>
          </Tab>
          <Tab eventKey="shopping" title="Shopping List">
            <Card>
              <Card.Header>Shopping List</Card.Header>
              <Card.Body>
                {itemsLoading ? (
                  <div className="text-center py-4"><Spinner animation="border" /></div>
                ) : itemsError ? (
                  <Alert variant="danger">{itemsError}</Alert>
                ) : shoppingList.length === 0 ? (
                  <Alert variant="info">No items to buy. All stocks are sufficient!</Alert>
                ) : (
                  <Table bordered responsive hover className="align-middle">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Quantity</th>
                        <th>Unit</th>
                        <th>Min Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shoppingList.map((item, idx) => (
                        <tr key={item._id}>
                          <td>{item.name}</td>
                          <td>{item.quantity}</td>
                          <td>{item.unit}</td>
                          <td>{item.minStock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Tab>
          <Tab eventKey="sabha" title="Sabha Usage / History">
            <Card>
              <Card.Header>Sabha Usage / History</Card.Header>
              <Card.Body>
                <h6 className="mb-3">Record Sabha Dinner</h6>
                <Row className="g-2 align-items-end mb-3">
                  <Col md={3}><Form.Control size="sm" type="date" value={newSabha.date} onChange={e => setNewSabha({ ...newSabha, date: e.target.value })} /></Col>
                  <Col md={3}><Form.Control size="sm" placeholder="Menu (e.g., Pav Bhaji)" value={newSabha.menu} onChange={e => setNewSabha({ ...newSabha, menu: e.target.value })} /></Col>
                  <Col md={2}><Form.Control size="sm" placeholder="Grocery Name" value={sabhaGrocery.name} onChange={e => setSabhaGrocery({ ...sabhaGrocery, name: e.target.value })} /></Col>
                  <Col md={2}><Form.Control size="sm" type="number" placeholder="Qty Used" value={sabhaGrocery.quantity} onChange={e => setSabhaGrocery({ ...sabhaGrocery, quantity: e.target.value })} /></Col>
                  <Col md={1}><Form.Control size="sm" placeholder="Unit" value={sabhaGrocery.unit} onChange={e => setSabhaGrocery({ ...sabhaGrocery, unit: e.target.value })} /></Col>
                  <Col md={1}><Button size="sm" variant="secondary" onClick={handleAddSabhaGrocery}>Add</Button></Col>
                </Row>
                {newSabha.groceriesUsed && newSabha.groceriesUsed.length > 0 && (
                  <Table bordered size="sm" className="mb-3">
                    <thead><tr><th>Grocery</th><th>Qty Used</th><th>Unit</th></tr></thead>
                    <tbody>
                      {newSabha.groceriesUsed.map((g, idx) => (
                        <tr key={idx}><td>{g.name}</td><td>{g.quantity}</td><td>{g.unit}</td></tr>
                      ))}
                    </tbody>
                  </Table>
                )}
                <Button size="sm" variant="success" onClick={handleAddSabha}>Save Sabha Record</Button>
                <hr />
                <h6>Sabha History</h6>
                {sabhaLoading ? (
                  <div className="text-center py-4"><Spinner animation="border" /></div>
                ) : sabhaError ? (
                  <Alert variant="danger">{sabhaError}</Alert>
                ) : sabhaRecords.length === 0 ? (
                  <Alert variant="info">No Sabha records yet.</Alert>
                ) : (
                  <Table bordered responsive hover className="align-middle">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Menu</th>
                        <th>Groceries Used</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sabhaRecords.map((rec) => (
                        <tr key={rec._id}>
                          <td>{rec.date
                            ? (() => {
                                const d = new Date(rec.date);
                                if (isNaN(d.getTime())) {
                                  return rec.date.slice(0, 10);
                                }
                                return d.toLocaleDateString('en-CA', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                });
                              })()
                            : ''}
                          </td>
                          <td>{rec.menu}</td>
                          <td>
                            <ul className="mb-0">
                              {(rec.groceriesUsed || []).map((g, i) => (
                                <li key={i}>{g.name} - {g.quantity} {g.unit}</li>
                              ))}
                            </ul>
                          </td>
                          <td>
                            <Button
                              size="sm"
                              variant="danger"
                              title="Delete"
                              onClick={() => handleDeleteSabha(rec._id)}
                              disabled={sabhaDeleteLoading === rec._id}
                            >
                              {sabhaDeleteLoading === rec._id ? (
                                <Spinner animation="border" size="sm" />
                              ) : (
                                <i className="fas fa-trash"></i>
                              )}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Tab>
        </Tabs>
      </Container>
    </>
  );
} 