
import React from 'react';
import { Modal, Button, Container, Row, Col, Card, Badge } from 'react-bootstrap';
import {
  formatDateForDisplay,
  formatPortalUpdateTime,
  summarizePortalFields,
  formatGender,
  formatEducationLevel,
  formatInstitution,
  formatPostGradPlan,
  formatYearList
} from '../../lib/adminUtils';

export default function ViewStudentModal({ show, onHide, selectedStudent }) {
  if (!selectedStudent) return null;

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      size="lg"
      scrollable
      contentClassName="solid-modal"
    >
      <Modal.Header closeButton>
        <Modal.Title className="h6">
          Student Details: {selectedStudent.first_name} {selectedStudent.last_name}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Container>
          {/* Moved Out Section */}
          {selectedStudent.moved_out && (
            <Card className="mb-3 border-danger">
              <Card.Body>
                <h5 className="text-danger mb-2">
                  <Badge bg="danger" className="me-2">Moved Out</Badge>
                  This student has moved out of Windsor
                </h5>
                <Row className="mb-2">
                  <Col xs={4}><strong>Date Moved Out:</strong></Col>
                  <Col xs={8}>{selectedStudent.moved_out_date ? formatDateForDisplay(selectedStudent.moved_out_date) : 'N/A'}</Col>
                </Row>
                <Row className="mb-2">
                  <Col xs={4}><strong>Job/Occupation:</strong></Col>
                  <Col xs={8}>{selectedStudent.moved_out_job || 'N/A'}</Col>
                </Row>
                <Row className="mb-2">
                  <Col xs={4}><strong>New Address:</strong></Col>
                  <Col xs={8}>{selectedStudent.moved_out_address || 'N/A'}</Col>
                </Row>
                <Row className="mb-2">
                  <Col xs={4}><strong>Notes:</strong></Col>
                  <Col xs={8}>{selectedStudent.moved_out_notes || 'N/A'}</Col>
                </Row>
              </Card.Body>
            </Card>
          )}
          <Row className="mb-2">
            <Col xs={4}><strong>First Name:</strong></Col>
            <Col xs={8}>{selectedStudent.first_name || 'N/A'}</Col>
          </Row>
          <Row className="mb-3">
            <Col xs={4}><strong>Portal Update:</strong></Col>
            <Col xs={8}>
              {selectedStudent.last_portal_update_at ? (
                <div className="d-flex flex-column">
                  <span className="fw-semibold">
                    {formatPortalUpdateTime(selectedStudent.last_portal_update_at) || 'Recently updated'}
                  </span>
                  <span className="text-muted small">
                    {new Date(selectedStudent.last_portal_update_at).toLocaleString()}
                  </span>
                  {selectedStudent.last_portal_update_fields?.length > 0 && (
                    <span className="text-muted small">
                      Fields: {summarizePortalFields(selectedStudent.last_portal_update_fields)}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-muted">No student-portal updates yet.</span>
              )}
            </Col>
          </Row>
          <Row className="mb-2">
            <Col xs={4}><strong>Last Name:</strong></Col>
            <Col xs={8}>{selectedStudent.last_name || 'N/A'}</Col>
          </Row>
          <Row className="mb-2">
            <Col xs={4}><strong>Mandal:</strong></Col>
            <Col xs={8}>{selectedStudent.mandal_name || 'Windsor'}</Col>
          </Row>
          <Row className="mb-2">
            <Col xs={4}><strong>Mukt Type:</strong></Col>
            <Col xs={8}>{selectedStudent.mukt_type || 'Yuvak'}</Col>
          </Row>
          <Row className="mb-2">
            <Col xs={4}><strong>Email:</strong></Col>
            <Col xs={8}>{selectedStudent.mail_id || 'N/A'}</Col>
          </Row>
          <Row className="mb-2">
            <Col xs={4}><strong>Phone:</strong></Col>
            <Col xs={8}>{selectedStudent.phone || 'N/A'}</Col>
          </Row>
          <Row className="mb-2">
            <Col xs={4}><strong>Gender:</strong></Col>
            <Col xs={8}>{formatGender(selectedStudent.gender)}</Col>
          </Row>
          <Row className="mb-2">
            <Col xs={4}><strong>Address:</strong></Col>
            <Col xs={8}>{selectedStudent.address || 'N/A'}</Col>
          </Row>
          <Row className="mb-2">
            <Col xs={4}><strong>Date of Birth:</strong></Col>
            <Col xs={8}>{selectedStudent.date_of_birth ? formatDateForDisplay(selectedStudent.date_of_birth) : 'N/A'}</Col>
          </Row>
          <Row className="mb-2">
            <Col xs={4}><strong>Education Level:</strong></Col>
            <Col xs={8}>{formatEducationLevel(selectedStudent.study_level || selectedStudent.education)}</Col>
          </Row>
          <Row className="mb-2">
            <Col xs={4}><strong>Program:</strong></Col>
            <Col xs={8}>{selectedStudent.study || 'N/A'}</Col>
          </Row>
          <Row className="mb-2">
            <Col xs={4}><strong>Institution:</strong></Col>
            <Col xs={8}>{formatInstitution(selectedStudent.study_institution)}</Col>
          </Row>
          <Row className="mb-2">
            <Col xs={4}><strong>Graduation:</strong></Col>
            <Col xs={8}>
              {selectedStudent.graduation_completed
                ? `Completed${selectedStudent.graduation_date ? ` on ${selectedStudent.graduation_date}` : ''}`
                : 'Not yet completed'}
            </Col>
          </Row>
          <Row className="mb-2">
            <Col xs={4}><strong>Post-Grad Plan:</strong></Col>
            <Col xs={8}>{formatPostGradPlan(selectedStudent.post_graduation_plan) || 'N/A'}</Col>
          </Row>
          {selectedStudent.post_graduation_plan === 'working' && (
            <>
              <Row className="mb-2">
                <Col xs={4}><strong>Employer:</strong></Col>
                <Col xs={8}>{selectedStudent.employment_company || 'N/A'}</Col>
              </Row>
              <Row className="mb-2">
                <Col xs={4}><strong>Role:</strong></Col>
                <Col xs={8}>{selectedStudent.employment_role || 'N/A'}</Col>
              </Row>
            </>
          )}
          <Row className="mb-2">
            <Col xs={4}><strong>Box Cricket:</strong></Col>
            <Col xs={8}>
              {selectedStudent.box_cricket ? `Yes (${formatYearList(selectedStudent.box_cricket_years)} years)` : 'No'}
            </Col>
          </Row>
          <Row className="mb-2">
            <Col xs={4}><strong>Atmiya Cricket Tournament:</strong></Col>
            <Col xs={8}>
              {selectedStudent.atmiya_cricket_tournament ? `Yes (${formatYearList(selectedStudent.atmiya_cricket_years)} years)` : 'No'}
            </Col>
          </Row>
          <Row className="mb-2">
            <Col xs={4}><strong>Atmiya Youth Shibir:</strong></Col>
            <Col xs={8}>
              {selectedStudent.atmiya_youth_shibir ? `Yes (${formatYearList(selectedStudent.atmiya_youth_years)} years)` : 'No'}
            </Col>
          </Row>
          <Row className="mb-2">
            <Col xs={4}><strong>Yuva Mahotsav:</strong></Col>
            <Col xs={8}>
              {selectedStudent.yuva_mahotsav ? `Yes (${formatYearList(selectedStudent.yuva_mahotsav_years)} years)` : 'No'}
            </Col>
          </Row>
          <Row className="mb-2">
            <Col xs={4}><strong>Harimay:</strong></Col>
            <Col xs={8}>{selectedStudent.harimay ? 'Yes' : 'No'}</Col>
          </Row>
          <Row className="mb-2">
            <Col xs={4}><strong>Emergency Contact:</strong></Col>
            <Col xs={8}>{selectedStudent.emergency_contact || 'N/A'}</Col>
          </Row>
          <Row className="mb-2">
            <Col xs={4}><strong>Notes:</strong></Col>
            <Col xs={8}>{selectedStudent.notes || 'N/A'}</Col>
          </Row>
        </Container>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" size="sm" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
