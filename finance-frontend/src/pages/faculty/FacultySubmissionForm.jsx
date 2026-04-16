import React, { useState } from 'react';
import apiClient from '../../api/client';
import { toast } from 'sonner';

const FacultySubmissionForm = () => {
  const [formData, setFormData] = useState({
    requestType: '',
    companyName: '',
    billFile: null,
    patentStatus: '',
    approvedAmount: '',
    durationYears: '',
    approvalDate: '',
    amountReceived: '',
    fundSource: '',
    fundType: '',
    proposalFile: null,
    requestedAmount: '',
    reason: '',
  });

  const [participants, setParticipants] = useState([]);
  const [currentParticipant, setCurrentParticipant] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  const handleAddParticipant = () => {
    if (currentParticipant.trim()) {
      setParticipants((prev) => [...prev, currentParticipant.trim()]);
      setCurrentParticipant('');
    }
  };

  const handleRemoveParticipant = (index) => {
    setParticipants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.requestType) {
      toast.error('Please select a Request Type');
      return;
    }
    if (!formData.fundType) {
      toast.error('Please select a Fund Type (Internal or External)');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
          if (value !== null && value !== '') {
              if (key === 'billFile') {
                  payload.append('bill', value);
              } else if (key === 'proposalFile') {
                  payload.append('proposal', value);
              } else {
                  payload.append(key, value);
              }
          }
      });
      payload.append('participants', JSON.stringify(participants));

      await apiClient.post('/faculty/request', payload, {
          headers: {
              'Content-Type': 'multipart/form-data'
          }
      });

      toast.success('Your request has been submitted successfully!');
      
      setFormData({
        requestType: '',
        companyName: '',
        billFile: null,
        patentStatus: '',
        approvedAmount: '',
        durationYears: '',
        approvalDate: '',
        amountReceived: '',
        fundSource: '',
        fundType: '',
        proposalFile: null,
        requestedAmount: '',
        reason: '',
      });
      setParticipants([]);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-xl shadow-md p-6 sm:p-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Faculty Request Form</h1>
        <p className="text-gray-500 mb-8 border-b pb-6">
          Please fill out the details below to submit your request.
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          <section className="bg-gray-50 p-6 rounded-xl border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <span className="bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-full text-xs mr-3">1</span>
              Request Type <span className="text-red-500 ml-1">*</span>
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Request Type</label>
              <select
                name="requestType"
                value={formData.requestType}
                onChange={handleChange}
                className="w-full sm:w-1/2 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="">-- Choose an option --</option>
                <option value="Value Added Course">Value Added Course</option>
                <option value="Seminar">Seminar</option>
                <option value="Internship">Internship</option>
                <option value="Certification">Certification</option>
                <option value="Project">Project</option>
              </select>
            </div>
          </section>

          <section className="bg-gray-50 p-6 rounded-xl border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <span className="bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-full text-xs mr-3">2</span>
              Fund Type <span className="text-red-500 ml-1">*</span>
            </h2>
            <div className="flex gap-6">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="fundType"
                  value="Internal"
                  checked={formData.fundType === 'Internal'}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700 font-medium">Internal</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="fundType"
                  value="External"
                  checked={formData.fundType === 'External'}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700 font-medium">External</span>
              </label>
            </div>
          </section>

          <section className="bg-gray-50 p-6 rounded-xl border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <span className="bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-full text-xs mr-3">3</span>
              Organization Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Agency Name</label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="Enter agency name"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Bill (for equipment)</label>
                <input
                  type="file"
                  name="billFile"
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white focus:outline-none"
                />
              </div>
            </div>
          </section>

          <section className="bg-gray-50 p-6 rounded-xl border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <span className="bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-full text-xs mr-3">4</span>
              Patent Details
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Patent Status</label>
              <select
                name="patentStatus"
                value={formData.patentStatus}
                onChange={handleChange}
                className="w-full sm:w-1/2 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="">-- Choose an option --</option>
                <option value="Published">Published</option>
                <option value="FER">FER</option>
                <option value="Granted">Granted</option>
                <option value="Submitted">Submitted</option>
              </select>
            </div>
          </section>

          <section className="bg-gray-50 p-6 rounded-xl border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <span className="bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-full text-xs mr-3">5</span>
              Project & Fund Summary
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sanctioned Amount (₹)</label>
                <input
                  type="number"
                  name="approvedAmount"
                  value={formData.approvedAmount}
                  onChange={handleChange}
                  placeholder="Enter sanctioned amount"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount Received</label>
                <input
                  type="number"
                  name="amountReceived"
                  value={formData.amountReceived}
                  onChange={handleChange}
                  placeholder="Enter amount received"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Duration (Years)</label>
                <input
                  type="number"
                  name="durationYears"
                  value={formData.durationYears}
                  onChange={handleChange}
                  placeholder="Enter duration in years"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fund Source</label>
                <select
                  name="fundSource"
                  value={formData.fundSource}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="">-- Choose an option --</option>
                  <option value="PFMS">PFMS</option>
                  <option value="Institution">Institution</option>
                  <option value="Research">Research</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Date of Sanction Order</label>
                <input
                  type="date"
                  name="approvalDate"
                  value={formData.approvalDate}
                  onChange={handleChange}
                  className="w-full sm:w-1/2 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-700"
                />
              </div>
            </div>
          </section>

          <section className="bg-gray-50 p-6 rounded-xl border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <span className="bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-full text-xs mr-3">6</span>
              Participants
            </h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={currentParticipant}
                onChange={(e) => setCurrentParticipant(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddParticipant())}
                placeholder="Enter participant name"
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddParticipant}
                className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-3 rounded-lg font-medium transition-colors whitespace-nowrap"
              >
                + Add Participant
              </button>
            </div>
            
            {participants.length > 0 && (
              <ul className="mt-4 space-y-2">
                {participants.map((person, index) => (
                  <li key={index} className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                    <span className="text-gray-700 font-medium">{person}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveParticipant(index)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-gray-50 p-6 rounded-xl border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <span className="bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-full text-xs mr-3">7</span>
              Equipment / Proposal
            </h2>
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Upload Proposal</label>
                  <input
                    type="file"
                    name="proposalFile"
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-lg bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Requested Amount</label>
                  <input
                    type="number"
                    name="requestedAmount"
                    value={formData.requestedAmount}
                    onChange={handleChange}
                    placeholder="Enter requested amount"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                <textarea
                  name="reason"
                  rows="3"
                  value={formData.reason}
                  onChange={handleChange}
                  placeholder="Explain why you need this equipment"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                />
              </div>
            </div>
          </section>

          <div className="pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-4 rounded-xl font-bold text-lg text-white transition-all ${
                isSubmitting 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl'
              }`}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default FacultySubmissionForm;
