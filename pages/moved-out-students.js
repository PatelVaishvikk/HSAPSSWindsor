import { useEffect, useState } from 'react';
import { Container, Card, Table, Spinner, Alert, Row, Col, Button } from 'react-bootstrap';
import Navbar from '../components/Navbar';
import Head from 'next/head';

export default function MovedOutStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchStudents() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/students?limit=0');
        if (!res.ok) throw new Error('Failed to fetch students');
        const data = await res.json();
        setStudents((data.students || []).filter(s => s.moved_out));
      } catch (err) {
        setError(err.message || 'Failed to load students');
      } finally {
        setLoading(false);
      }
    }
    fetchStudents();
  }, []);

  return (
    <>
      <Head>
        <title>Moved Out Students - HSAPSS Windsor</title>
      </Head>
      <Navbar />
      <Container className="py-4">
        <Row className="mb-3">
          <Col>
            <h2 className="fw-bold">Moved Out Students</h2>
            <p className="text-muted">List of students who have moved out of Windsor, with their new job and address details.</p>
          </Col>
          <Col className="text-end">
            <Button href="/students-table" variant="secondary">Back to Students</Button>
          </Col>
        </Row>
        <Card className="shadow-sm">
          <Card.Body>
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <div className="mt-2 text-muted">Loading moved out students...</div>
              </div>
            ) : error ? (
              <Alert variant="danger">{error}</Alert>
            ) : students.length === 0 ? (
              <Alert variant="info">No students have been marked as moved out.</Alert>
            ) : (
              <Table responsive bordered hover className="align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Name</th>
                    <th>Date Moved Out</th>
                    <th>Job/Occupation</th>
                    <th>New Address</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(student => (
                    <tr key={student._id}>
                      <td>{student.first_name} {student.last_name}</td>
                      <td>{student.moved_out_date ? new Date(student.moved_out_date).toLocaleDateString() : '-'}</td>
                      <td>{student.moved_out_job || '-'}</td>
                      <td>{student.moved_out_address || '-'}</td>
                      <td>{student.moved_out_notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      </Container>
    </>
  );
} 