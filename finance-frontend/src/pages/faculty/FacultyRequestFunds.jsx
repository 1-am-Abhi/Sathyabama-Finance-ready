import React, { useState, useEffect, useMemo } from "react";
import { Button } from "../../components/ui/button";
import { usePipeline } from "../../contexts/PipelineContext";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationContext";
import { formatCurrency } from "../../utils/format";
import apiClient from "../../api/client";
import RequestTimeline from "./RequestTimeline";

const FacultyRequestFunds = () => {
  const { 
    projects, 
    fundRequests, 
    createRequest, 
    isLoading,
    refetchProjects,
    refetchFundRequests 
  } = usePipeline();
  const { user } = useAuth();
  const { addNotification, fetchNotifications } = useNotifications();

  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [timelineData, setTimelineData] = useState({});
  const [expandedRequestId, setExpandedRequestId] = useState(null);

  // Utilization proof upload (installment proof-gating)
  const PROOF_TYPES = ['BILL', 'INVOICE', 'UTILIZATION_CERTIFICATE', 'SUPPORTING'];
  const [proofModal, setProofModal] = useState({ open: false, requestId: null });
  const [proofFile, setProofFile] = useState(null);
  const [proofType, setProofType] = useState('UTILIZATION_CERTIFICATE');
  const [proofSubmitting, setProofSubmitting] = useState(false);
  const [proofError, setProofError] = useState('');

  const openProofModal = (requestId) => {
    setProofFile(null);
    setProofType('UTILIZATION_CERTIFICATE');
    setProofError('');
    setProofModal({ open: true, requestId });
  };

  const handleProofSubmit = async () => {
    if (proofSubmitting) return;
    if (!proofFile) {
      setProofError('Please select a proof file to upload.');
      return;
    }
    setProofSubmitting(true);
    setProofError('');
    try {
      const fd = new FormData();
      fd.append('proof', proofFile);
      fd.append('proofType', proofType);
      await apiClient.post(`/fund-requests/${proofModal.requestId}/proofs`, fd);
      if (refetchFundRequests) await refetchFundRequests();
      setProofModal({ open: false, requestId: null });
      setProofFile(null);
    } catch (err) {
      setProofError(
        err?.response?.data?.message || err?.message || 'Failed to upload proof.'
      );
    } finally {
      setProofSubmitting(false);
    }
  };

  const projectList = useMemo(() => projects || [], [projects]);
  const requestHistory = fundRequests || [];

  // Polling for notifications to ensure reliability (Task 6)
  useEffect(() => {
    if (fetchNotifications) {
      const interval = setInterval(fetchNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [fetchNotifications]);

  useEffect(() => {
    if (projectList.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projectList[0]._id || projectList[0].id);
    }
  }, [projectList, selectedProjectId]);

  const selectedProject = projectList.find(
    (p) => (p._id || p.id) === selectedProjectId
  );

  // The faculty who submits a project is its Principal Investigator by default
  // (project.facultyId). Also accept explicit piId/userId if present.
  const uid = user?._id || user?.id;
  const isPI =
    !!selectedProject &&
    [selectedProject.piId, selectedProject.userId, selectedProject.facultyId]
      .filter(Boolean)
      .some((v) => v === uid || v === user?._id || v === user?.id);

  // DATA CORRECTNESS (CRITICAL) - Task 1
  const sanctionedAmount = Number(selectedProject?.sanctionedBudget || 0);
  const releasedAmount =
    selectedProject?.releasedBudget !== undefined &&
    selectedProject?.releasedBudget !== null
      ? Number(selectedProject.releasedBudget)
      : (selectedProject?.Disbursements || []).reduce(
          (sum, d) => sum + Number(d.amount || 0),
          0
        );
  const remainingAmount = Math.max(
    sanctionedAmount - releasedAmount,
    0
  );

  // BUTTON LOGIC (FINAL) - Task 4
  const canRequest = isPI && remainingAmount > 0;

  // ENSURE REAL API CALL (NO SILENT FAIL) - Task 2
  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      setError("");

      const numericAmount = Number(amount);

      if (!numericAmount || numericAmount <= 0) {
        return setError("Amount must be greater than 0");
      }

      if (numericAmount > remainingAmount) {
        return setError("Amount exceeds remaining budget");
      }

      const payload = new FormData();
      payload.append("projectRef", selectedProject._id);
      payload.append("projectTitle", selectedProject.title);
      payload.append("requestedAmount", numericAmount);
      payload.append("purpose", reason);
      payload.append("source", selectedProject.fundingSource || "INSTITUTIONAL");
      if (file) {
        payload.append("bill", file);
      }

      await createRequest(payload);

      // force UI sync
      if (refetchProjects) await refetchProjects();
      if (refetchFundRequests) await refetchFundRequests();

      addNotification({
        role: "ADMIN",
        type: "finance",
        message: `New installment request for ${selectedProject.title}`,
        actionUrl: "/admin/fund-requests",
      });

      setShowModal(false);
      setAmount("");
      setReason("");
      setFile(null);
    } catch (err) {
      console.error("[ERROR] createRequest failed:", err);
      setError(err?.response?.data?.error || err?.response?.data?.message || err?.message || "Failed to create request");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTimeline = async (reqId) => {
    if (expandedRequestId === reqId) {
      setExpandedRequestId(null);
      return;
    }
    setExpandedRequestId(reqId);
    if (!timelineData[reqId]) {
      try {
        const res = await apiClient.get(`/fund-requests/${reqId}/audit`);
        setTimelineData((prev) => ({ ...prev, [reqId]: res.data.data }));
      } catch (err) {
        console.error("Failed to load timeline", err);
      }
    }
  };

  if (isLoading) return <div className="p-8 text-center text-gray-900 dark:text-white">Loading...</div>;

  return (
    <div className="flex h-full min-h-[calc(100vh-4rem)] bg-white dark:bg-slate-900 text-gray-900 dark:text-white">
      {/* LEFT PANEL - Project Selector */}
      <div className="w-1/3 border-r border-gray-200 dark:border-slate-800 p-6 overflow-y-auto space-y-4">
        <h2 className="font-bold text-xl text-gray-900 dark:text-white mb-6">Your Projects</h2>
        {projectList.map((p) => {
          const id = p._id || p.id;
          const isActive = id === selectedProjectId;
          
          const pSanctioned = Number(p?.sanctionedBudget || 0);
          const pReleased =
            p?.releasedBudget !== undefined && p?.releasedBudget !== null
              ? Number(p.releasedBudget)
              : (p?.Disbursements || []).reduce(
                  (sum, d) => sum + Number(d.amount || 0),
                  0
                );
          const pRemaining = Math.max(pSanctioned - pReleased, 0);

          return (
            <div 
              key={id} 
              onClick={() => setSelectedProjectId(id)}
              className={`p-5 rounded-xl cursor-pointer transition-all shadow-sm ${isActive ? 'bg-blue-100 dark:bg-blue-900 border border-blue-500 shadow-blue-500/20' : 'bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 border border-transparent'}`}
            >
              <h3 className="font-semibold text-gray-900 dark:text-white leading-tight mb-2">{p.title}</h3>
              <p className="text-sm text-blue-600 dark:text-blue-300 font-medium">Remaining: {formatCurrency(pRemaining)}</p>
            </div>
          );
        })}
        {projectList.length === 0 && (
          <p className="text-gray-500 italic text-sm">No projects assigned.</p>
        )}
      </div>

      {/* RIGHT PANEL - Main Content */}
      <div className="w-2/3 p-8 overflow-y-auto">
        {selectedProject ? (
          <div className="space-y-8 max-w-4xl mx-auto">
            {/* TOP - Metrics Cards */}
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-2 font-medium uppercase tracking-wider">Total Budget</p>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(sanctionedAmount)}</h2>
              </div>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-2 font-medium uppercase tracking-wider">Released</p>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(releasedAmount)}</h2>
              </div>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-2 font-medium uppercase tracking-wider">Remaining</p>
                <h2 className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(remainingAmount)}</h2>
              </div>
            </div>

            {/* CENTER - Action Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-900 p-8 rounded-xl text-center shadow-lg border border-blue-100 dark:border-blue-800/50">
              <h2 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">
                {releasedAmount > 0 ? "Request Next Installment" : "Request First Installment"}
              </h2>
              <p className="text-gray-600 dark:text-blue-200 mb-6 text-sm max-w-md mx-auto">
                Submit your expense justification to request funds. Approval workflows will notify you at each stage.
              </p>

              <Button
                disabled={!canRequest}
                onClick={() => setShowModal(true)}
                className="px-8 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-semibold text-md shadow-md"
              >
                {!isPI
                  ? "PI Only"
                  : remainingAmount <= 0
                  ? "Budget Exhausted"
                  : releasedAmount > 0
                  ? "Request Next Installment"
                  : "Request First Installment"}
              </Button>
            </div>

            {/* BOTTOM - Request History */}
            <div>
              <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-5 border-b border-gray-200 dark:border-slate-800 pb-2">Request History</h3>
              <div className="space-y-4">
                {requestHistory
                  .filter(r => {
                    const pid = r.projectId || r.projectRef;
                    return pid === selectedProject?._id || pid === selectedProject?.id;
                  })
                  .length === 0 ? (
                    <p className="text-gray-500 italic bg-gray-50 dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 text-center">No request history for this project.</p>
                ) : (
                  requestHistory
                    .filter(r => {
                      const pid = r.projectId || r.projectRef;
                      return pid === selectedProject?._id || pid === selectedProject?.id;
                    })
                    .map((r) => (
                    <React.Fragment key={r._id || r.id}>
                      <div className="bg-white dark:bg-slate-800 p-5 rounded-xl flex justify-between items-center border border-gray-200 dark:border-slate-700 transition-all hover:border-gray-300 dark:hover:border-slate-600 shadow-sm">
                        <div>
                          <p className="font-semibold text-lg text-gray-900 dark:text-white flex items-center gap-3">
                            {formatCurrency(r.requestedAmount)}
                            <span className="text-xs font-bold text-blue-300 bg-blue-900/30 px-2.5 py-1 rounded-md border border-blue-800/50 tracking-wider">INST #{r.installmentNumber || '?'}</span>
                          </p>
                          <p className="text-sm text-gray-400 mt-2 line-clamp-2 max-w-lg">
                            {r.purpose || 'No purpose provided'}
                          </p>
                        </div>

                        <div className="text-right flex flex-col items-end gap-3">
                          <span className={`text-xs px-3 py-1 rounded font-bold uppercase tracking-wider ${
                            r.status === 'APPROVED' ? 'bg-green-900/40 text-green-400 border border-green-800/50' :
                            r.status === 'DISBURSED' ? 'bg-blue-900/40 text-blue-400 border border-blue-800/50' :
                            r.status === 'REJECTED' ? 'bg-red-900/40 text-red-400 border border-red-800/50' :
                            'bg-yellow-900/40 text-yellow-400 border border-yellow-800/50'
                          }`}>
                            {r.status}
                          </span>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" className="h-7 text-xs font-semibold text-emerald-500 hover:text-emerald-400 hover:bg-slate-800 transition-colors" onClick={() => openProofModal(r._id || r.id)}>
                              Submit Proofs
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs font-semibold text-blue-400 hover:text-blue-300 hover:bg-slate-800 transition-colors" onClick={() => toggleTimeline(r._id || r.id)}>
                              {expandedRequestId === (r._id || r.id) ? "Hide Timeline" : "View Timeline"}
                            </Button>
                          </div>
                        </div>
                      </div>
                      {expandedRequestId === (r._id || r.id) && timelineData[r._id || r.id] && (
                        <div className="ml-6 -mt-3 p-5 bg-gray-50 dark:bg-slate-900/80 border border-gray-200 dark:border-slate-700 rounded-b-xl border-t-0 shadow-inner">
                          <RequestTimeline timeline={timelineData[r._id || r.id]} />
                        </div>
                      )}
                    </React.Fragment>
                    ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 italic text-lg bg-gray-50 dark:bg-slate-800 p-8 rounded-xl border border-gray-200 dark:border-slate-700">Select a project from the left panel to view details.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-7 rounded-2xl w-full max-w-md space-y-5 shadow-2xl">
            <h3 className="font-bold text-xl text-gray-900 dark:text-white border-b border-gray-200 dark:border-slate-700 pb-3">Request Installment</h3>

            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Amount (Max: {formatCurrency(remainingAmount)})</label>
              <input
                type="number"
                placeholder="₹0.00"
                value={amount}
                onChange={(e) => {
                  if (e.target.value === "") return setAmount("");
                  const value = Number(e.target.value);
                  if (isNaN(value) || value <= 0) return;
                  if (value > remainingAmount) return;
                  setAmount(value);
                }}
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white p-3.5 rounded-xl mt-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                max={remainingAmount}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Reason / Usage</label>
              <textarea
                placeholder="Explain the purpose of this request..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white p-3.5 rounded-xl mt-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Bill / Invoice (Optional)</label>
              <div className="mt-2 flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-gray-300 dark:border-slate-700 border-dashed rounded-xl cursor-pointer bg-gray-50 dark:bg-slate-950 hover:bg-gray-100 dark:hover:bg-slate-900 hover:border-blue-500/50 transition-all">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {file ? <span className="text-blue-400 font-medium bg-blue-900/30 px-3 py-1.5 rounded-lg">{file.name}</span> : <span>Click to select or drag and drop file</span>}
                    </p>
                  </div>
                  <input type="file" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
                </label>
              </div>
            </div>

            {error && <p className="text-red-600 dark:text-red-400 text-sm font-medium bg-red-50 dark:bg-red-950/40 px-4 py-3 rounded-xl border border-red-200 dark:border-red-900/50">{error}</p>}

            <div className="flex gap-3 mt-8 pt-2">
              <Button onClick={() => setShowModal(false)} variant="outline" className="flex-1 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-700 h-11 rounded-xl">Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white h-11 rounded-xl shadow-md font-semibold">
                {submitting ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Utilization Proof Upload Modal */}
      {proofModal.open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-7 rounded-2xl w-full max-w-md space-y-5 shadow-2xl">
            <h3 className="font-bold text-xl text-gray-900 dark:text-white border-b border-gray-200 dark:border-slate-700 pb-3">Submit Utilization Proofs</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Upload utilization proof for this installment. Verified proofs are required before the next installment can be requested.
            </p>

            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Proof Type</label>
              <select
                value={proofType}
                onChange={(e) => setProofType(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white p-3 rounded-xl mt-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                {PROOF_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Proof File</label>
              <div className="mt-2 flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-gray-300 dark:border-slate-700 border-dashed rounded-xl cursor-pointer bg-gray-50 dark:bg-slate-950 hover:bg-gray-100 dark:hover:bg-slate-900 hover:border-blue-500/50 transition-all">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {proofFile ? <span className="text-blue-400 font-medium bg-blue-900/30 px-3 py-1.5 rounded-lg">{proofFile.name}</span> : <span>Click to select proof document</span>}
                    </p>
                  </div>
                  <input type="file" className="hidden" onChange={(e) => setProofFile(e.target.files[0])} />
                </label>
              </div>
            </div>

            {proofError && <p className="text-red-600 dark:text-red-400 text-sm font-medium bg-red-50 dark:bg-red-950/40 px-4 py-3 rounded-xl border border-red-200 dark:border-red-900/50">{proofError}</p>}

            <div className="flex gap-3 mt-6 pt-2">
              <Button onClick={() => setProofModal({ open: false, requestId: null })} variant="outline" className="flex-1 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-700 h-11 rounded-xl">Cancel</Button>
              <Button onClick={handleProofSubmit} disabled={proofSubmitting} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white h-11 rounded-xl shadow-md font-semibold">
                {proofSubmitting ? "Uploading..." : "Upload Proof"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyRequestFunds;
