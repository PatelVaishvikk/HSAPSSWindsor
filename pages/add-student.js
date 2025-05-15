import { useState } from 'react';
import { Form, Button, Toast, Alert, Card, Badge, Row, Col, InputGroup } from 'react-bootstrap';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { FaPlus, FaTimes, FaSave, FaUndo } from 'react-icons/fa';
import Navbar from '../components/Navbar';

export default function AddStudent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState('success');
  const [error, setError] = useState('');
  
  // Enhanced form data with events array
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    mail_id: '',
    phone: '',
    address: '',
    date_of_birth: '',
    gender: '',
    education: '',
    emergency_contact: '',
    notes: '',
    events: [], // Array to store multiple events
    // Moved out fields
    moved_out: false,
    moved_out_date: '',
    moved_out_job: '',
    moved_out_address: '',
    moved_out_notes: ''
  });

  // Event types for dropdown
  const eventTypes = [
    'Yuva Mahotsav',
    'Atmiya Youth Shibir',
    'Box Cricket',
    'Atmiya Cricket Tournament',
    'Seva Day',
    'Youth Camp',
    'Cultural Program',
    'Sports Event',
    'Other'
  ];

  // Add a new event entry
  const addEvent = () => {
    setFormData(prev => ({
      ...prev,
      events: [...prev.events, { type: '', year: '', role: '', notes: '' }]
    }));
  };

  // Remove an event entry
  const removeEvent = (index) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.filter((_, i) => i !== index)
    }));
  };

  // Update event data
  const updateEvent = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.map((event, i) => 
        i === index ? { ...event, [field]: value } : event
      )
    }));
  };

  // Utility to display toast messages
  const showToastMessage = (message, variant = 'success') => {
    setToastMessage(message);
    setToastVariant(variant);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Prevent form submission when Enter is pressed on non-textarea inputs
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    
    setLoading(true);
    setError('');
    setShowToast(false);

    // Clean up and normalize form data
    const cleanedFormData = {
      ...formData,
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      mail_id: formData.mail_id.trim().toLowerCase(),
      phone: formData.phone.trim(),
      address: formData.address?.trim() || '',
      date_of_birth: formData.date_of_birth || null,
      gender: formData.gender || '',
      education: formData.education || '',
      emergency_contact: formData.emergency_contact?.trim() || '',
      notes: formData.notes?.trim() || '',
      events: formData.events.map(event => ({
        ...event,
        type: event.type.trim(),
        year: event.year.trim(),
        role: event.role?.trim() || '',
        notes: event.notes?.trim() || ''
      })),
      moved_out: formData.moved_out || false,
      moved_out_date: formData.moved_out_date || '',
      moved_out_job: formData.moved_out_job || '',
      moved_out_address: formData.moved_out_address || '',
      moved_out_notes: formData.moved_out_notes || ''
    };

    // Validate required fields
    if (!cleanedFormData.first_name || !cleanedFormData.last_name || !cleanedFormData.phone) {
      const errorMsg = 'Please fill in all required fields (First name, Last name, Phone)';
      setError(errorMsg);
      showToastMessage(errorMsg, 'danger');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(cleanedFormData)
      });
      
      const textResponse = await response.text();
      let data = {};
      if (textResponse) {
        try {
          data = JSON.parse(textResponse);
        } catch {
          throw new Error('Failed to parse server response');
        }
      }
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add student');
      }
      
      showToastMessage('Student added successfully!');
      
      // Clear the form
      setFormData({
        first_name: '',
        last_name: '',
        mail_id: '',
        phone: '',
        address: '',
        date_of_birth: '',
        gender: '',
        education: '',
        emergency_contact: '',
        notes: '',
        events: [],
        moved_out: false,
        moved_out_date: '',
        moved_out_job: '',
        moved_out_address: '',
        moved_out_notes: ''
      });
      
      // Redirect to Students table after a short delay
      setTimeout(() => {
        router.push('/students-table');
      }, 2000);
    } catch (err) {
      console.error('Error in form submission:', err);
      const errorMessage = err.message || 'An error occurred while adding the student';
      setError(errorMessage);
      showToastMessage(errorMessage, 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      mail_id: '',
      phone: '',
      address: '',
      date_of_birth: '',
      gender: '',
      education: '',
      emergency_contact: '',
      notes: '',
      events: [],
      moved_out: false,
      moved_out_date: '',
      moved_out_job: '',
      moved_out_address: '',
      moved_out_notes: ''
    });
    setError('');
  };

  return (
    <>
      <Head>
        <title>Add Student - HSAPSS Windsor</title>
      </Head>

      <Navbar />

      <div className="container-fluid py-4">
        <Row className="justify-content-center">
          <Col lg={10}>
            <Card className="shadow-sm">
              <Card.Header className="bg-primary text-white">
                <h4 className="mb-0">Add New Student</h4>
              </Card.Header>
              
              <Card.Body>
                {error && (
                  <Alert variant="danger" className="mb-4" onClose={() => setError('')} dismissible>
                    {error}
                  </Alert>
                )}
                
                <Form onSubmit={handleSubmit} onKeyDown={handleKeyDown} noValidate>
                  {/* Personal Information Section */}
                  <Card className="mb-4">
                    <Card.Header className="bg-light">
                      <h5 className="mb-0">Personal Information</h5>
                    </Card.Header>
                    <Card.Body>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>
                              First Name <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Control
                              type="text"
                              value={formData.first_name}
                              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                              required
                              placeholder="Enter first name"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>
                              Last Name <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Control
                              type="text"
                              value={formData.last_name}
                              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                              required
                              placeholder="Enter last name"
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Email</Form.Label>
                            <Form.Control
                              type="email"
                              value={formData.mail_id}
                              onChange={(e) => setFormData({ ...formData, mail_id: e.target.value })}
                              placeholder="Enter email address"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>
                              Phone <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Control
                              type="tel"
                              value={formData.phone}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                              required
                              placeholder="Enter phone number"
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      <Form.Group className="mb-3">
                        <Form.Label>Address</Form.Label>
                        <Form.Control
                          type="text"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          placeholder="Enter address"
                        />
                      </Form.Group>

                      <Row>
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>Date of Birth</Form.Label>
                            <Form.Control
                              type="date"
                              value={formData.date_of_birth}
                              onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>Gender</Form.Label>
                            <Form.Select
                              value={formData.gender}
                              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                            >
                              <option value="">Select Gender</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="other">Other</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>Education</Form.Label>
                            <Form.Select
                              value={formData.education}
                              onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                            >
                              <option value="">Select Education</option>
                              <option value="high_school">High School</option>
                              <option value="undergraduate">Undergraduate</option>
                              <option value="graduate">Graduate</option>
                              <option value="post_graduate">Post Graduate</option>
                              <option value="other">Other</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>
                      </Row>

                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Emergency Contact</Form.Label>
                            <Form.Control
                              type="tel"
                              value={formData.emergency_contact}
                              onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                              placeholder="Emergency contact number"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Notes</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={2}
                              value={formData.notes}
                              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                              placeholder="Any additional notes"
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                      {/* Moved Out Section */}
                      <Card className="mb-3">
                        <Card.Header className="bg-light">
                          <h6 className="mb-0">Moved Out Information</h6>
                        </Card.Header>
                        <Card.Body>
                          <Form.Check
                            type="checkbox"
                            id="movedOutCheckbox"
                            label="Student has moved out of Windsor"
                            checked={formData.moved_out}
                            onChange={e => setFormData({ ...formData, moved_out: e.target.checked })}
                            className="mb-3"
                          />
                          {formData.moved_out && (
                            <>
                              <Row>
                                <Col md={6}>
                                  <Form.Group className="mb-3">
                                    <Form.Label>Date Moved Out</Form.Label>
                                    <Form.Control
                                      type="date"
                                      value={formData.moved_out_date}
                                      onChange={e => setFormData({ ...formData, moved_out_date: e.target.value })}
                                    />
                                  </Form.Group>
                                </Col>
                                <Col md={6}>
                                  <Form.Group className="mb-3">
                                    <Form.Label>Job/Occupation</Form.Label>
                                    <Form.Control
                                      type="text"
                                      value={formData.moved_out_job}
                                      onChange={e => setFormData({ ...formData, moved_out_job: e.target.value })}
                                      placeholder="What job are they doing?"
                                    />
                                  </Form.Group>
                                </Col>
                              </Row>
                              <Form.Group className="mb-3">
                                <Form.Label>New Address</Form.Label>
                                <Form.Control
                                  type="text"
                                  value={formData.moved_out_address}
                                  onChange={e => setFormData({ ...formData, moved_out_address: e.target.value })}
                                  placeholder="New address after moving out"
                                />
                              </Form.Group>
                              <Form.Group className="mb-3">
                                <Form.Label>Notes about move</Form.Label>
                                <Form.Control
                                  as="textarea"
                                  rows={2}
                                  value={formData.moved_out_notes}
                                  onChange={e => setFormData({ ...formData, moved_out_notes: e.target.value })}
                                  placeholder="Any notes about the move (optional)"
                                />
                              </Form.Group>
                            </>
                          )}
                        </Card.Body>
                      </Card>
                    </Card.Body>
                  </Card>

                  {/* Events Section */}
                  <Card className="mb-4">
                    <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                      <h5 className="mb-0">Events & Participation</h5>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={addEvent}
                        className="d-flex align-items-center"
                      >
                        <FaPlus className="me-1" /> Add Event
                      </Button>
                    </Card.Header>
                    <Card.Body>
                      {formData.events.length === 0 ? (
                        <Alert variant="info">
                          No events added yet. Click the "Add Event" button to add participation details.
                        </Alert>
                      ) : (
                        formData.events.map((event, index) => (
                          <Card key={index} className="mb-3 border">
                            <Card.Body>
                              <div className="d-flex justify-content-between align-items-start mb-3">
                                <h6 className="mb-0">Event #{index + 1}</h6>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => removeEvent(index)}
                                  className="d-flex align-items-center"
                                >
                                  <FaTimes className="me-1" /> Remove
                                </Button>
                              </div>
                              
                              <Row>
                                <Col md={6}>
                                  <Form.Group className="mb-3">
                                    <Form.Label>Event Type</Form.Label>
                                    <Form.Select
                                      value={event.type}
                                      onChange={(e) => updateEvent(index, 'type', e.target.value)}
                                    >
                                      <option value="">Select Event</option>
                                      {eventTypes.map((type) => (
                                        <option key={type} value={type}>{type}</option>
                                      ))}
                                    </Form.Select>
                                  </Form.Group>
                                </Col>
                                <Col md={6}>
                                  <Form.Group className="mb-3">
                                    <Form.Label>Year</Form.Label>
                                    <Form.Control
                                      type="text"
                                      value={event.year}
                                      onChange={(e) => updateEvent(index, 'year', e.target.value)}
                                      placeholder="Enter year(s) of participation"
                                    />
                                  </Form.Group>
                                </Col>
                              </Row>

                              <Row>
                                <Col md={6}>
                                  <Form.Group className="mb-3">
                                    <Form.Label>Role/Position</Form.Label>
                                    <Form.Control
                                      type="text"
                                      value={event.role}
                                      onChange={(e) => updateEvent(index, 'role', e.target.value)}
                                      placeholder="E.g., Participant, Volunteer, Organizer"
                                    />
                                  </Form.Group>
                                </Col>
                                <Col md={6}>
                                  <Form.Group className="mb-3">
                                    <Form.Label>Event Notes</Form.Label>
                                    <Form.Control
                                      as="textarea"
                                      rows={1}
                                      value={event.notes}
                                      onChange={(e) => updateEvent(index, 'notes', e.target.value)}
                                      placeholder="Any specific details about participation"
                                    />
                                  </Form.Group>
                                </Col>
                              </Row>
                            </Card.Body>
                          </Card>
                        ))
                      )}
                    </Card.Body>
                  </Card>

                  {/* Form Actions */}
                  <div className="d-flex justify-content-between">
                    <Button
                      variant="outline-secondary"
                      onClick={resetForm}
                      className="d-flex align-items-center"
                      disabled={loading}
                    >
                      <FaUndo className="me-2" /> Reset Form
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      className="d-flex align-items-center"
                      disabled={loading}
                    >
                      <FaSave className="me-2" />
                      {loading ? 'Saving...' : 'Save Student'}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>

      {/* Toast Notification */}
      <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 1000 }}>
        <Toast show={showToast} onClose={() => setShowToast(false)} bg={toastVariant} delay={3000} autohide>
          <Toast.Header closeButton={false}>
            <strong className="me-auto">
              {toastVariant === 'success' ? 'Success' : 'Error'}
            </strong>
          </Toast.Header>
          <Toast.Body className={toastVariant === 'success' ? 'text-white' : ''}>
            {toastMessage}
          </Toast.Body>
        </Toast>
      </div>
    </>
  );
}
