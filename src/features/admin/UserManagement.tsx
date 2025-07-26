import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Trash2, UserPlus, Shield, Users, Activity, Info } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { fetchAuditLogs } from '@/store/slices/auditSlice';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface User {
  Username: string;
  Attributes: Array<{ Name: string; Value: string }>;
  Enabled: boolean;
  UserStatus: string;
  groups?: string[];
}

interface Role {
  GroupName: string;
  Description?: string;
  Precedence?: number;
}

interface UserManagementProps {
  users: User[];
  onRefresh: () => void;
  section: 'users' | 'activity';
  setSection: React.Dispatch<React.SetStateAction<'users' | 'activity'>>;
}

const ACTIVITY_COLUMNS = [
  { key: 'timestamp', label: 'Timestamp' },
  { key: 'user', label: 'User' },
  { key: 'action', label: 'Action' },
  { key: 'severity', label: 'Severity' },
  { key: 'category', label: 'Category' },
  { key: 'details', label: 'Details' },
  { key: 'resource', label: 'Resource' },
];

const getUserEmail = (user: User) => {
  return user.Attributes.find(attr => attr.Name === 'email')?.Value || 'No email';
};
const getUserStatus = (user: User) => {
  return user.Enabled ? 'Active' : 'Disabled';
};
const getUserRoles = (user: User) => {
  return user.groups || [];
};

const UserManagement: React.FC<UserManagementProps> = ({ users, onRefresh, section, setSection }) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Modal states
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  
  // Form states
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    groups: [] as string[],
  });

  // Pagination state
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(users.length / pageSize));
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const username = user.Username.toLowerCase();
      const email = getUserEmail(user).toLowerCase();
      const status = getUserStatus(user).toLowerCase();
      const roles = (user.groups || []).map(r => r.toLowerCase()).join(',');
      return (
        (!userSearch || username.includes(userSearch.toLowerCase()) || email.includes(userSearch.toLowerCase())) &&
        (!userStatusFilter || status === userStatusFilter.toLowerCase()) &&
        (!userRoleFilter || roles.includes(userRoleFilter.toLowerCase()))
      );
    });
  }, [users, userSearch, userStatusFilter, userRoleFilter]);
  const pagedUsers = useMemo(() => filteredUsers.slice((page - 1) * pageSize, page * pageSize), [filteredUsers, page]);

  // Redux for audit logs
  const dispatch = useDispatch<AppDispatch>();
  const { logs: auditLogs, isLoading: logsLoading, error: logsError } = useSelector((state: RootState) => state.audit);

  // Fetch roles on component mount
  useEffect(() => {
    fetchRoles();
  }, []);

  // Fetch audit logs when switching to activity section
  useEffect(() => {
    if (section === 'activity' && auditLogs.length === 0 && !logsLoading) {
      // TODO: Fix audit logs fetching
      // dispatch(fetchAuditLogs({}));
    }
  }, [section, dispatch, auditLogs.length, logsLoading]);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:4000/api/roles');
      if (!response.ok) throw new Error('Failed to fetch roles');
      const data = await response.json();
      setRoles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch roles');
    } finally {
      setLoading(false);
    }
  };

  const handleManageRoles = (user: User) => {
    setSelectedUser(user);
    setSelectedRoles(user.groups || []);
    setShowRoleModal(true);
  };

  const handleSaveRoles = async () => {
    if (!selectedUser) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Get current user roles
      const currentRoles = selectedUser.groups || [];
      
      // Add new roles
      for (const role of selectedRoles) {
        if (!currentRoles.includes(role)) {
          const response = await fetch(`http://localhost:4000/api/roles/${role}/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: selectedUser.Username }),
          });
          if (!response.ok) throw new Error(`Failed to add role ${role}`);
        }
      }
      
      // Remove roles that are no longer selected
      for (const role of currentRoles) {
        if (!selectedRoles.includes(role)) {
          const response = await fetch(`http://localhost:4000/api/roles/${role}/remove`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: selectedUser.Username }),
          });
          if (!response.ok) throw new Error(`Failed to remove role ${role}`);
        }
      }
      
      setSuccess('User roles updated successfully');
      setShowRoleModal(false);
      onRefresh(); // Refresh user list to get updated roles
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user roles');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:4000/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }
      
      setSuccess('User created successfully');
      setShowCreateUserModal(false);
      setNewUser({ username: '', email: '', groups: [] }); // Reset groups
      onRefresh(); // Refresh user list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`http://localhost:4000/api/users/${username}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete user');
      
      setSuccess('User deleted successfully');
      onRefresh(); // Refresh user list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  const [showInviteSentModal, setShowInviteSentModal] = useState(false);

  const handleResendInvite = async (username: string) => {
    if (!window.confirm(`Resend invitation email to ${username}?`)) return;
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`http://localhost:4000/api/users/${encodeURIComponent(username)}/resend-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (response.ok) {
        setShowInviteSentModal(true);
        setSuccess(null); // Hide old success alert
      } else {
        setError('Failed to resend invitation: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      setError('Network error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const USER_COLUMNS = [
    { key: 'Username', label: 'Username' },
    { key: 'Email', label: 'Email' },
    { key: 'Status', label: 'Status' },
    { key: 'Roles', label: 'Roles' },
  ];

  const [logSearch, setLogSearch] = useState('');
  const [logSeverityFilter, setLogSeverityFilter] = useState('');
  const [logCategoryFilter, setLogCategoryFilter] = useState('');
  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const user = (log.user || '').toLowerCase();
      const action = (log.action || '').toLowerCase();
      const severity = (log.severity || '').toLowerCase();
      const category = (log.category || '').toLowerCase();
      const details = (log.details || '').toLowerCase();
      return (
        (!logSearch || user.includes(logSearch.toLowerCase()) || action.includes(logSearch.toLowerCase()) || details.includes(logSearch.toLowerCase())) &&
        (!logSeverityFilter || severity === logSeverityFilter.toLowerCase()) &&
        (!logCategoryFilter || category === logCategoryFilter.toLowerCase())
      );
    });
  }, [auditLogs, logSearch, logSeverityFilter, logCategoryFilter]);

  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [resourceModalOpen, setResourceModalOpen] = useState(false);
  const [resourceModalData, setResourceModalData] = useState<any>(null);

  return (
    <div className="w-full">
      {section === 'users' && (
        <div className="bg-white rounded-lg shadow p-6 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
            <div className="flex gap-2 items-center">
              <Input
                placeholder="Search username or email..."
                value={userSearch}
                onChange={e => { setUserSearch(e.target.value); setPage(1); }}
                className="w-56"
              />
              <select
                value={userStatusFilter}
                onChange={e => { setUserStatusFilter(e.target.value); setPage(1); }}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Disabled">Disabled</option>
              </select>
              <select
                value={userRoleFilter}
                onChange={e => { setUserRoleFilter(e.target.value); setPage(1); }}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="">All Roles</option>
                {roles.map(role => (
                  <option key={role.GroupName} value={role.GroupName}>{role.GroupName}</option>
                ))}
              </select>
            </div>
            <Button onClick={() => setShowCreateUserModal(true)} className="bg-blue-600 hover:bg-blue-700">
              <UserPlus className="w-4 h-4 mr-2" />
              Create User
            </Button>
          </div>
          {error && (
            <Alert className="border-red-200 bg-red-50 mb-4">
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="border-green-200 bg-green-50 mb-4">
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}
          <div className="overflow-x-auto border rounded-lg">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  {USER_COLUMNS.map(col => (
                    <TableHead key={col.key} className="font-semibold text-sm text-gray-900 bg-gray-50">{col.label}</TableHead>
                  ))}
                  <TableHead className="font-semibold text-sm text-gray-900 bg-gray-50">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={USER_COLUMNS.length + 1} className="text-center text-gray-400 py-8">No users found. Please add a user to get started.</TableCell>
                  </TableRow>
                ) : (
                  pagedUsers.map((user, idx) => (
                    <TableRow key={user.Username} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <TableCell>{user.Username}</TableCell>
                      <TableCell>{user.Attributes.find((a: any) => a.Name === 'email')?.Value || ''}</TableCell>
                      <TableCell>{user.Enabled ? 'Active' : 'Disabled'}</TableCell>
                      <TableCell>{(user.groups && user.groups.length > 0) ? user.groups.join(', ') : <span className="text-gray-400">No roles</span>}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleManageRoles(user)} disabled={loading}>Manage Roles</Button>
                          <Button variant="outline" size="sm" onClick={() => handleResendInvite(user.Username)} disabled={loading}>Resend Invite</Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteUser(user.Username)} disabled={loading} className="text-red-600 hover:text-red-700 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex gap-2 items-center mt-2">
            <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={page === 1}>{'«'}</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page === 1}>{'‹'}</Button>
            <span className="text-sm">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page === totalPages}>{'›'}</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(totalPages)} disabled={page === totalPages}>{'»'}</Button>
            <select
              className="ml-2 border rounded px-2 py-1 text-sm focus:outline-none"
              value={pageSize}
              onChange={e => {
                setPage(1);
                // If you want to make page size dynamic, update pageSize state here
              }}
              style={{ minWidth: 80 }}
              disabled
            >
              <option value={10}>10 / page</option>
            </select>
          </div>
          {/* Manage Roles Modal */}
          <Dialog open={showRoleModal} onOpenChange={setShowRoleModal}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Manage User Roles</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">User: {selectedUser?.Username}</Label>
                </div>
                <div className="mt-4">
                  <Label className="text-sm font-medium">Assign Roles</Label>
                  <div className="flex flex-wrap gap-4 mt-2">
                    {roles.map((role) => (
                      <div key={role.GroupName} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`manage-role-${role.GroupName}`}
                          checked={selectedRoles.includes(role.GroupName)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRoles([...selectedRoles, role.GroupName]);
                            } else {
                              setSelectedRoles(selectedRoles.filter((g) => g !== role.GroupName));
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor={`manage-role-${role.GroupName}`} className="text-sm">
                          {role.GroupName}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowRoleModal(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveRoles} disabled={loading}>
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Create User Modal */}
          <Dialog open={showCreateUserModal} onOpenChange={setShowCreateUserModal}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    placeholder="Enter username"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="Enter email"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Assign Roles</Label>
                  <div className="flex flex-wrap gap-4 mt-2">
                    {roles.map((role) => (
                      <div key={role.GroupName} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`create-role-${role.GroupName}`}
                          checked={newUser.groups?.includes(role.GroupName)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewUser({ ...newUser, groups: [...(newUser.groups || []), role.GroupName] });
                            } else {
                              setNewUser({ ...newUser, groups: (newUser.groups || []).filter((g) => g !== role.GroupName) });
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor={`create-role-${role.GroupName}`} className="text-sm">
                          {role.GroupName}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCreateUserModal(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateUser} disabled={loading} className="bg-blue-600 hover:bg-blue-700 w-full">
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Create User
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Invitation Sent Modal */}
          <Dialog open={showInviteSentModal} onOpenChange={setShowInviteSentModal}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Invitation Sent</DialogTitle>
              </DialogHeader>
              <div className="py-4 text-center text-lg">Invitation email was sent successfully.</div>
              <DialogFooter>
                <Button onClick={() => setShowInviteSentModal(false)} autoFocus>OK</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
      {section === 'activity' && (
        <div className="overflow-x-auto border rounded-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2 p-2">
            <div className="flex gap-2 items-center">
              <Input
                placeholder="Search user, action, or details..."
                value={logSearch}
                onChange={e => setLogSearch(e.target.value)}
                className="w-56"
              />
              <select
                value={logSeverityFilter}
                onChange={e => setLogSeverityFilter(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="">All Severities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="error">Error</option>
                <option value="critical">Critical</option>
              </select>
              <select
                value={logCategoryFilter}
                onChange={e => setLogCategoryFilter(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="">All Categories</option>
                <option value="auth">Auth</option>
                <option value="user_management">User Management</option>
                <option value="system">System</option>
              </select>
            </div>
          </div>
          {logsLoading ? (
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner size="md" message="Loading activity logs..." color="primary" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No activity logs found.</div>
          ) : (
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  {ACTIVITY_COLUMNS.map(col => (
                    <TableHead key={col.key} className="font-semibold text-sm text-gray-900 bg-gray-50">{col.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log, idx) => {
                  let parsedDetails: any = {};
                  try {
                    parsedDetails = log.details ? JSON.parse(log.details) : {};
                  } catch {}
                  // Subtle color for severity
                  let severityClass = '';
                  if (["error", "critical"].includes((log.severity || '').toLowerCase())) severityClass = 'text-red-600 font-semibold';
                  else if (["high", "warning"].includes((log.severity || '').toLowerCase())) severityClass = 'text-yellow-700 font-semibold';
                  else severityClass = 'text-gray-700';
                  // Expandable details for error/critical
                  const isExpandable = ["error", "critical"].includes((log.severity || '').toLowerCase());
                  const isExpanded = expandedLogId === log.id;
                  return (
                    <>
                      <TableRow key={log.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <TableCell>{log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}</TableCell>
                        <TableCell>{log.user || ''}</TableCell>
                        <TableCell>{log.action || ''}</TableCell>
                        <TableCell className={severityClass}>{log.severity || ''}</TableCell>
                        <TableCell>{log.category || ''}</TableCell>
                        <TableCell>
                          {isExpandable ? (
                            <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setExpandedLogId(isExpanded ? null : log.id)}>
                              {isExpanded ? (parsedDetails.originalDetails || log.details || '') : 'Show details'}
                            </span>
                          ) : (
                            parsedDetails.originalDetails || log.details || ''
                          )}
                        </TableCell>
                        <TableCell>
                          <span>{log.resourceId || ''}</span>
                          {(log.resourceType || log.metadata) && (
                            <button
                              type="button"
                              className="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
                              title="Show resource details"
                              onClick={() => { setResourceModalData(log); setResourceModalOpen(true); }}
                            >
                              <Info className="inline w-4 h-4 align-middle" />
                            </button>
                          )}
                        </TableCell>
                      </TableRow>
                      {/* Optionally, add a second row for expanded error details if you want more space */}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      )}
      {/* Resource Details Modal */}
      <Dialog open={resourceModalOpen} onOpenChange={setResourceModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resource Details</DialogTitle>
          </DialogHeader>
          {resourceModalData && (
            <div className="space-y-2">
              {resourceModalData.resourceType && (
                <div><strong>Resource Type:</strong> {resourceModalData.resourceType}</div>
              )}
              {resourceModalData.resourceId && (
                <div><strong>Resource ID:</strong> {resourceModalData.resourceId}</div>
              )}
              {resourceModalData.metadata && (
                <div>
                  <strong>Metadata:</strong>
                  <pre className="bg-gray-100 rounded p-2 text-xs overflow-x-auto mt-1">
                    {JSON.stringify(resourceModalData.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setResourceModalOpen(false)} autoFocus>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement; 