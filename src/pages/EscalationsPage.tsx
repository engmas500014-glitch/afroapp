import React, { useState } from "react";
import {
  useAppContext,
  Escalation,
  EscalationReply,
} from "../store/AppContext";
import {
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  Clock,
  Plus,
  X,
  Search,
  ChevronRight,
  User as UserIcon,
  Trash2,
  Edit,
} from "lucide-react";
import { Button, Input } from "../components/ui";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";

export function EscalationsPage() {
  const {
    user,
    escalations,
    setEscalations,
    systemUsers,
    visibleEmployees: employees,
    permissions,
  } = useAppContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedEscalationId, setSelectedEscalationId] = useState<
    string | null
  >(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [newEscalation, setNewEscalation] = useState({
    subject: "",
    description: "",
    managerId: "", // The person it is escalated to
  });

  const [replyText, setReplyText] = useState("");

  // Helper to format usernames
  const getUserDisplayName = (username: string) => {
    // Check if it's an HR code
    const emp = employees.find((e) => e.hrCode === username);
    if (emp)
      return (
        <span title={emp.name} className="cursor-help">
          {username}
        </span>
      );
    return username;
  };

  // Managers/Admin system users that an employee can escalate to
  const managerUsers = systemUsers.filter(
    (u) => u.role === "Admin" || u.role === "Manager" || u.role === "HR",
  );

  const filteredEscalations = escalations.filter((esc) => {
    // If the logged in user is an Employee, they should only see their own escalations.
    // Assuming simple mapping where Employee name matches user.name or user.id
    // But since employees might just use the generic 'Employee' login, we'll use user.name.
    if (user?.role === "Employee" && esc.employeeName !== user.name) {
      return false;
    }

    // Similarly for managers, maybe they only see escalations directed to them, but for now we'll allow HR/Admin to see all
    if (user?.role === "Manager" && esc.managerName !== user.name) {
      return false;
    }

    if (statusFilter !== "All" && esc.status !== statusFilter) {
      return false;
    }

    const s = searchTerm.toLowerCase();
    return (
      esc.subject.toLowerCase().includes(s) ||
      esc.employeeName.toLowerCase().includes(s) ||
      esc.id.toLowerCase().includes(s)
    );
  });

  const selectedEscalation = escalations.find(
    (e) => e.id === selectedEscalationId,
  );

  const getStatusColor = (status: Escalation["status"]) => {
    switch (status) {
      case "Pending":
        return "text-warning bg-warning/10 border-warning/30";
      case "In Progress":
        return "text-accent bg-accent/10 border-accent/30";
      case "Resolved":
        return "text-success bg-success/10 border-success/30";
      case "Rejected":
        return "text-danger bg-danger/10 border-danger/30";
      default:
        return "text-muted-fg bg-muted/10 border-border/50 dark:bg-muted dark:border-border";
    }
  };

  const getStatusIcon = (status: Escalation["status"]) => {
    switch (status) {
      case "Pending":
        return <Clock className="w-4 h-4" />;
      case "In Progress":
        return <AlertCircle className="w-4 h-4" />;
      case "Resolved":
        return <CheckCircle2 className="w-4 h-4" />;
      case "Rejected":
        return <X className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const [editEscalationId, setEditEscalationId] = useState<string | null>(null);

  const handleEditClick = (esc: Escalation) => {
    setNewEscalation({
      subject: esc.subject,
      description: esc.description,
      managerId: systemUsers.find((u) => u.name === esc.managerName)?.id || "",
    });
    setEditEscalationId(esc.id);
    setIsModalOpen(true);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newEscalation.subject ||
      !newEscalation.description ||
      (!newEscalation.managerId && user?.role === "Employee")
    )
      return;

    const manager = managerUsers.find((m) => m.id === newEscalation.managerId);

    if (editEscalationId) {
      setEscalations(
        escalations.map((esc) => {
          if (esc.id === editEscalationId) {
            return {
              ...esc,
              subject: newEscalation.subject,
              description: newEscalation.description,
              managerName: manager?.name || esc.managerName,
            };
          }
          return esc;
        }),
      );
    } else {
      const esc: Escalation = {
        id: `ESC-${Date.now().toString().slice(-4)}`,
        employeeId: user?.id || "unknown",
        employeeName: user?.name || "Unknown",
        managerName: manager?.name || "Admin",
        subject: newEscalation.subject,
        description: newEscalation.description,
        date: new Date().toISOString().split("T")[0],
        status: "Pending",
        replies: [],
      };
      setEscalations([esc, ...escalations]);
    }

    setIsModalOpen(false);
    setEditEscalationId(null);
    setNewEscalation({ subject: "", description: "", managerId: "" });
  };

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedEscalationId) return;

    const newReply: EscalationReply = {
      id: Math.random().toString(36).substr(2, 9),
      author: user?.name || "Unknown",
      date: new Date().toISOString(),
      comment: replyText,
    };

    setEscalations(
      escalations.map((esc) => {
        if (esc.id === selectedEscalationId) {
          // If an admin/manager replies, maybe change status to In Progress
          let newStatus = esc.status;
          if (esc.status === "Pending" && user?.role !== "Employee") {
            newStatus = "In Progress";
          }

          return {
            ...esc,
            status: newStatus,
            replies: [...esc.replies, newReply],
          };
        }
        return esc;
      }),
    );

    setReplyText("");
  };

  const updateStatus = (newStatus: Escalation["status"]) => {
    if (!selectedEscalationId) return;
    setEscalations(
      escalations.map((esc) =>
        esc.id === selectedEscalationId ? { ...esc, status: newStatus } : esc,
      ),
    );
  };

  const hasPermission = (module: string, action: string) => {
    if (!user) return false;
    const p = permissions.find(
      (x) => x.module === module && x.action === action,
    );
    return p ? p.roles[user.role] : false;
  };

  const canEditDelete = hasPermission(
    "Escalations",
    "Edit / Delete Escalations",
  );

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (!deleteConfirmId) return;
    setEscalations(escalations.filter((e) => e.id !== deleteConfirmId));
    if (selectedEscalationId === deleteConfirmId) setSelectedEscalationId(null);
    setDeleteConfirmId(null);
  };

  return (
    <div className="flex h-[calc(100vh-100px)] gap-6">
      {/* Left panel: List */}
      <div className="w-1/3 min-w-[300px] flex flex-col bg-card-bg border border-border shadow-sm rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-sans tracking-tight">
              Escalations
            </h2>
            {user?.role === "Employee" && (
              <Button
                onClick={() => setIsModalOpen(true)}
                size="sm"
                className="gap-2"
              >
                <Plus className="w-4 h-4" /> New
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-fg" />
              <Input
                placeholder="Search escalations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              className="flex h-10 w-[120px] shrink-0 rounded-xl border border-border bg-card-bg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 focus-visible:border-accent text-ink"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All" className="bg-card-bg text-ink">
                All Status
              </option>
              <option value="Pending" className="bg-card-bg text-ink">
                Pending
              </option>
              <option value="In Progress" className="bg-card-bg text-ink">
                In Progress
              </option>
              <option value="Resolved" className="bg-card-bg text-ink">
                Resolved
              </option>
              <option value="Rejected" className="bg-card-bg text-ink">
                Rejected
              </option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-2 relative">
          {filteredEscalations.map((esc) => (
            <motion.div
              key={esc.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelectedEscalationId(esc.id)}
              className={cn(
                "p-4 rounded-lg cursor-pointer border transition-all duration-200",
                selectedEscalationId === esc.id
                  ? "bg-accent/5 border-accent shadow-sm"
                  : "bg-card-bg border-border hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm",
              )}
            >
              <div className="flex justify-between items-start mb-2 gap-2">
                <span className="text-sm font-semibold truncate flex-1">
                  {esc.subject}
                </span>
                <span
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 font-medium select-none whitespace-nowrap",
                    getStatusColor(esc.status),
                  )}
                >
                  {getStatusIcon(esc.status)}
                  {esc.status}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-muted-fg">
                <span className="flex items-center gap-1">
                  <UserIcon className="w-3 h-3" />{" "}
                  {getUserDisplayName(esc.employeeName)}
                </span>
                <span>{esc.date}</span>
              </div>
            </motion.div>
          ))}
          {filteredEscalations.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-fg pointer-events-none p-4 text-center">
              <MessageSquare className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-sm">No escalations found</p>
            </div>
          )}
        </div>
      </div>

      {/* Right panel: Details */}
      <div className="flex-1 bg-card-bg border border-border bg-gradient-to-b from-card-bg to-muted/20 shadow-sm rounded-xl overflow-hidden flex flex-col relative">
        {selectedEscalation ? (
          <>
            <div className="p-6 border-b border-border bg-card-bg">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
                    {selectedEscalation.subject}
                    {canEditDelete && (
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => handleEditClick(selectedEscalation)}
                          className="p-1.5 text-muted-fg/80 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors border border-transparent hover:border-accent/20"
                          title="Edit Escalation"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteClick(selectedEscalation.id)
                          }
                          className="p-1.5 text-muted-fg/80 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors border border-transparent hover:border-danger/20"
                          title="Delete Escalation"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-muted-fg">
                    <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md border border-border">
                      <UserIcon className="w-4 h-4" /> From:{" "}
                      {getUserDisplayName(selectedEscalation.employeeName)}
                    </span>
                    <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md border border-border">
                      <UserIcon className="w-4 h-4" /> To:{" "}
                      {getUserDisplayName(selectedEscalation.managerName)}
                    </span>
                    <span>{selectedEscalation.date}</span>
                  </div>
                </div>
                <span
                  className={cn(
                    "text-xs px-3 py-1 rounded-full border flex items-center gap-1.5 font-bold uppercase tracking-wider",
                    getStatusColor(selectedEscalation.status),
                  )}
                >
                  {getStatusIcon(selectedEscalation.status)}
                  {selectedEscalation.status}
                </span>
              </div>
              <div className="bg-muted/50 p-4 rounded-xl text-sm border border-border leading-relaxed text-ink/90">
                {selectedEscalation.description}
              </div>

              {(user?.role === "Admin" ||
                user?.role === "HR" ||
                user?.role === "Manager") && (
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    variant={
                      selectedEscalation.status === "Resolved"
                        ? "default"
                        : "outline"
                    }
                    onClick={() => updateStatus("Resolved")}
                    className={
                      selectedEscalation.status === "Resolved"
                        ? "bg-success text-white hover:bg-success/90 border-transparent"
                        : "text-success border-success/30 hover:bg-success/10 hover:text-success"
                    }
                  >
                    Mark Resolved
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      selectedEscalation.status === "Rejected"
                        ? "default"
                        : "outline"
                    }
                    onClick={() => updateStatus("Rejected")}
                    className={
                      selectedEscalation.status === "Rejected"
                        ? "bg-danger text-white hover:bg-danger/90 border-transparent"
                        : "text-danger border-danger/30 hover:bg-danger/10 hover:text-danger"
                    }
                  >
                    Mark Rejected
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      selectedEscalation.status === "In Progress"
                        ? "default"
                        : "outline"
                    }
                    onClick={() => updateStatus("In Progress")}
                    className={
                      selectedEscalation.status === "In Progress"
                        ? "bg-accent text-white hover:bg-accent/90 border-transparent"
                        : "text-accent border-accent/30 hover:bg-accent/10 hover:text-accent"
                    }
                  >
                    Mark In Progress
                  </Button>
                </div>
              )}
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              <h3 className="font-semibold text-muted-fg uppercase tracking-widest text-xs flex items-center gap-2">
                Replies{" "}
                <span className="bg-muted px-2 py-0.5 rounded-full">
                  {selectedEscalation.replies.length}
                </span>
              </h3>
              <div className="space-y-4">
                <AnimatePresence>
                  {selectedEscalation.replies.map((reply) => (
                    <motion.div
                      key={reply.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      role="article"
                      className={cn(
                        "p-4 rounded-xl max-w-[85%] border shadow-sm",
                        reply.author === user?.name
                          ? "bg-accent/10 border-accent/20 ml-auto"
                          : "bg-card-bg border-border",
                      )}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-sm flex items-center gap-2">
                          {getUserDisplayName(reply.author)}
                          {reply.author === selectedEscalation.managerName && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 px-1.5 py-0.5 rounded uppercase tracking-wider">
                              Manager
                            </span>
                          )}
                          {reply.author === selectedEscalation.employeeName && (
                            <span className="text-[10px] bg-muted/80 text-ink/80 dark:bg-muted dark:text-muted-fg/80 px-1.5 py-0.5 rounded uppercase tracking-wider">
                              Employee
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-muted-fg">
                          {new Date(reply.date).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-ink/90 whitespace-pre-wrap">
                        {reply.comment}
                      </p>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {selectedEscalation.replies.length === 0 && (
                  <div className="text-center py-8 text-muted-fg text-sm italic">
                    No replies yet.
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-border bg-card-bg mt-auto">
              <form onSubmit={handleReply} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="Type your reply here..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={!replyText.trim()}
                  className="shrink-0 gap-2"
                >
                  Post Reply
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-fg p-8 text-center animate-in fade-in duration-500">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 opacity-50" />
            </div>
            <h3 className="text-xl font-bold text-ink mb-2">
              No Escalation Selected
            </h3>
            <p className="max-w-sm text-sm">
              Select an escalation from the list to view its details, or create
              a new one.
            </p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card-bg w-full max-w-lg rounded-2xl shadow-xl border border-border overflow-hidden"
          >
            <div className="flex justify-between items-center p-4 border-b border-border bg-muted/30">
              <h3 className="font-bold text-lg">
                {editEscalationId ? "Edit Escalation" : "Submit New Escalation"}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditEscalationId(null);
                  setNewEscalation({
                    subject: "",
                    description: "",
                    managerId: "",
                  });
                }}
                className="text-muted-fg/80 hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-semibold mb-1.5 block">
                  Send To (Manager)
                </label>
                <select
                  required
                  value={newEscalation.managerId}
                  onChange={(e) =>
                    setNewEscalation({
                      ...newEscalation,
                      managerId: e.target.value,
                    })
                  }
                  className="flex h-10 w-full rounded-xl border border-border bg-input-bg px-4 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 focus-visible:border-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="" disabled>
                    Select a Manager
                  </option>
                  {managerUsers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold mb-1.5 block">
                  Subject
                </label>
                <Input
                  required
                  placeholder="Brief summary of the issue"
                  value={newEscalation.subject}
                  onChange={(e) =>
                    setNewEscalation({
                      ...newEscalation,
                      subject: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1.5 block">
                  Description
                </label>
                <textarea
                  required
                  className="flex min-h-[120px] w-full rounded-xl border border-border bg-input-bg px-4 py-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 focus-visible:border-accent disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  placeholder="Provide details about your escalation..."
                  value={newEscalation.description}
                  onChange={(e) =>
                    setNewEscalation({
                      ...newEscalation,
                      description: e.target.value,
                    })
                  }
                />
              </div>
              <div className="flex justify-end pt-4 gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditEscalationId(null);
                    setNewEscalation({
                      subject: "",
                      description: "",
                      managerId: "",
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editEscalationId ? "Save Changes" : "Submit Escalation"}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card-bg w-full max-w-sm rounded-2xl shadow-xl border border-border overflow-hidden p-6 text-center"
          >
            <Trash2 className="w-12 h-12 text-danger mx-auto mb-4 opacity-80" />
            <h3 className="font-bold text-xl mb-2">Delete Escalation</h3>
            <p className="text-sm text-muted-fg mb-6">
              Are you sure you want to delete this escalation? This action
              cannot be undone.
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDeleteConfirmId(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={confirmDelete}
                className="bg-danger text-white hover:bg-danger/90"
              >
                Delete
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
