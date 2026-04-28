import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "../../components/ui/card";
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

  const isPI =
    selectedProject &&
    (selectedProject.piId === user?._id ||
      selectedProject.userId === user?._id);

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

      console.log("[DEBUG] Creating request:", {
        projectId: selectedProject._id,
        amount: numericAmount
      });

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

      console.log("[SUCCESS] Request created");

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

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent>
            <p>Total Budget</p>
            <h2>{formatCurrency(sanctionedAmount)}</h2>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p>Released</p>
            <h2>{formatCurrency(releasedAmount)}</h2>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p>Remaining</p>
            <h2>{formatCurrency(remainingAmount)}</h2>
          </CardContent>
        </Card>
      </div>

      {/* DEBUG VISIBILITY (TEMP) - Task 8 */}
      <div className="bg-yellow-100 p-2 text-xs border border-yellow-300">
        <p>DEBUG → Remaining: {remainingAmount}</p>
        <p>DEBUG → Released (Backend): {selectedProject?.releasedBudget}</p>
        <p>DEBUG → Sanctioned: {sanctionedAmount}</p>
      </div>

      {/* Project Selector */}
      <div className="flex gap-2 flex-wrap">
        {projectList.map((p) => {
          const id = p._id || p.id;
          const isActive = id === selectedProjectId;
          return (
            <button 
              key={id} 
              onClick={() => setSelectedProjectId(id)}
              className={`px-4 py-2 rounded ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              {p.title}
            </button>
          );
        })}
      </div>

      {/* Request Button */}
      {selectedProject && (
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold">{selectedProject.title}</h2>

          <Button
            disabled={!canRequest}
            onClick={() => setShowModal(true)}
          >
            {!isPI
              ? "PI Only"
              : remainingAmount <= 0
              ? "Budget Exhausted"
              : "Request Installment"}
          </Button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded w-96 space-y-4">
            <h3 className="font-bold text-lg">Request Installment</h3>

            <div>
              <label className="text-sm font-semibold">Amount (Max: {formatCurrency(remainingAmount)})</label>
              <input
                type="number"
                placeholder="Amount"
                value={amount}
                onChange={(e) => {
                  if (e.target.value === "") return setAmount("");
                  const value = Number(e.target.value);
                  if (isNaN(value) || value <= 0) return;
                  if (value > remainingAmount) return;
                  setAmount(value);
                }}
                className="w-full border p-2 rounded mt-1"
                max={remainingAmount}
              />
            </div>

            <div>
              <label className="text-sm font-semibold">Reason / Usage</label>
              <textarea
                placeholder="Reason / Usage"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full border p-2 rounded mt-1"
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-semibold">Bill / Invoice (Optional)</label>
              <input type="file" onChange={(e) => setFile(e.target.files[0])} className="w-full border p-2 rounded mt-1" />
            </div>

            {error && <p className="text-red-500 text-sm font-semibold">{error}</p>}

            <div className="flex gap-2 mt-4">
              <Button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-blue-600 text-white">
                {submitting ? "Submitting..." : "Submit"}
              </Button>
              <Button onClick={() => setShowModal(false)} variant="outline" className="flex-1">Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      <div className="mt-8">
        <h3 className="font-bold text-lg mb-4">Request History</h3>
        <div className="space-y-2">
          {requestHistory
            .filter(r => {
              const pid = r.projectId || r.projectRef;
              return pid === selectedProject?._id || pid === selectedProject?.id;
            })
            .length === 0 ? (
              <p className="text-gray-500 italic">No request history for this project.</p>
          ) : (
            requestHistory
              .filter(r => {
                const pid = r.projectId || r.projectRef;
                return pid === selectedProject?._id || pid === selectedProject?.id;
              })
              .map((r) => (
              <React.Fragment key={r._id || r.id}>
                <div className="p-3 border rounded flex justify-between items-center bg-gray-50">
                  <div>
                    <span className="font-semibold text-gray-800">Installment #{r.installmentNumber || '?'}</span>
                    <span className="ml-2 text-sm text-gray-600">- {r.purpose || 'No purpose provided'}</span>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <div className="flex items-center gap-4">
                      <span className="font-bold">{formatCurrency(r.requestedAmount)}</span>
                      <span className={`px-2 py-1 text-xs rounded font-bold ${
                        r.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                        r.status === 'DISBURSED' ? 'bg-blue-100 text-blue-800' :
                        r.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {r.status}
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => toggleTimeline(r._id || r.id)}>
                      {expandedRequestId === (r._id || r.id) ? "Hide Timeline" : "View Timeline"}
                    </Button>
                  </div>
                </div>
                {expandedRequestId === (r._id || r.id) && timelineData[r._id || r.id] && (
                  <RequestTimeline timeline={timelineData[r._id || r.id]} />
                )}
              </React.Fragment>
              ))
          )}
        </div>
      </div>
    </div>
  );
};

export default FacultyRequestFunds;
