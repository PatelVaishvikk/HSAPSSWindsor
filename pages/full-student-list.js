
import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Navbar from '../components/Navbar';

const FullStudentList = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all students on mount
  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/students?limit=0');
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch students');
        }
        setStudents(data.students || []);
      } catch (err) {
        console.error('Error fetching students:', err);
        setError(err.message);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  // Delete a student and update list
  const deleteStudent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
      return;
    }
    try {
      const response = await fetch(`/api/students?id=${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Failed to delete student (Status: ${response.status})`);
      }
      setStudents(prevStudents => prevStudents.filter(student => student._id !== id));
    } catch (err) {
      console.error('Error deleting student:', err);
      setError(err.message);
    }
  };

  // Placeholder for future edit functionality
  const showEditModal = (student) => {
    console.log('Edit student:', student);
    // Implement logic to show an edit modal here
    alert(`Edit functionality for ${student.first_name} ${student.last_name} is not yet implemented.`);
  };

  // Helper function to render additional info from new fields
  const renderAdditionalInfo = (student) => {
    const details = [];
    if (student.education) {
      const eduText = student.education === 'masters' ? 'Masters' : student.education === 'pg_diploma' ? 'PG Diploma' : student.education;
      details.push(`Education: ${eduText}`);
    }
    if (student.box_cricket) {
      details.push(`Box Cricket (${student.box_cricket_years || '-' } yrs)`);
    }
    if (student.atmiya_cricket_tournament) {
      details.push(`Atmiya Cricket (${student.atmiya_cricket_years || '-' } yrs)`);
    }
    if (student.atmiya_youth_shibir) {
      details.push(`Atmiya Youth Shibir (${student.atmiya_youth_years || '-' } yrs)`);
    }
    if (student.yuva_mahotsav) {
      details.push(`Yuva Mahotsav (${student.yuva_mahotsav_years || '-' } yrs)`);
    }
    details.push(`Harimay: ${student.harimay ? 'Yes' : 'No'}`);
    return details.join('\n');
  };

  return (
    <>
      <Head>
        <title>Full Student List</title>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <Navbar />

      <div className="container my-4">
        <h1 className="text-center mb-4">📋 Full Student List</h1>

        {loading && (
          <div className="text-center p-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2 text-muted">Loading students...</p>
          </div>
        )}

        {error && !loading && (
          <div className="alert alert-danger" role="alert">
            <strong>Error:</strong> {error}
          </div>
        )}

        {!loading && !error && (
          <div className="card shadow-sm">
            <div className="card-header bg-light d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Student Details ({students.length})</h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-striped table-hover mb-0">
                  <thead className="table-dark sticky-top">
                    <tr>
                      <th>First Name</th>
                      <th>Last Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Address</th>
                      <th>Additional Info</th>
                      <th style={{ minWidth: '130px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student._id}>
                        <td>{student.first_name || 'N/A'}</td>
                        <td>{student.last_name || 'N/A'}</td>
                        <td>
                          {student.mail_id ? (
                            <a href={`mailto:${student.mail_id}`} className="text-decoration-none">
                              {student.mail_id}
                            </a>
                          ) : 'N/A'}
                        </td>
                        <td>
                          {student.phone ? (
                            <a href={`tel:${student.phone}`} className="text-decoration-none">
                              {student.phone}
                            </a>
                          ) : (
                            <span className="text-muted">N/A</span>
                          )}
                        </td>
                        <td>{student.address || <span className="text-muted">N/A</span>}</td>
                        <td style={{ whiteSpace: 'pre-wrap' }}>{renderAdditionalInfo(student)}</td>
                        <td>
                          <div className="d-flex gap-1 flex-wrap">
                            <button
                              className="btn btn-outline-primary btn-sm"
                              onClick={() => showEditModal(student)}
                              title="Edit Student"
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => deleteStudent(student._id)}
                              title="Delete Student"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {students.length === 0 && (
                      <tr>
                        <td colSpan="7" className="text-center p-4 text-muted">
                          No students found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default FullStudentList;
