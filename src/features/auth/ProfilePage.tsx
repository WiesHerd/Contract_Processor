import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { User, Shield, Bell, KeyRound, Save } from 'lucide-react';
import { updateUserAttributes, updatePassword } from 'aws-amplify/auth';

export default function ProfilePage() {
  const { user, attributes, checkUser } = useAuth(); // <-- Get attributes from context
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [isSavingInfo, setIsSavingInfo] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    if (attributes) {
      setFirstName(attributes.given_name || '');
      setLastName(attributes.family_name || '');
      setPhoneNumber(attributes.phone_number || '');
      setJobTitle(attributes['custom:job_title'] || '');
      setDepartment(attributes['custom:department'] || '');
    }
  }, [attributes]);

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingInfo(true);
    try {
      await updateUserAttributes({
        userAttributes: {
          given_name: firstName,
          family_name: lastName,
          phone_number: phoneNumber,
          'custom:job_title': jobTitle,
          'custom:department': department,
        },
      });
      await checkUser(); // Refresh user context
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile.');
    } finally {
      setIsSavingInfo(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPassword(true);
    try {
      await updatePassword({ oldPassword, newPassword });
      toast.success('Password updated successfully!');
      setOldPassword('');
      setNewPassword('');
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Failed to update password. Check your current password.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  if (!user || !attributes) { // <-- Check for attributes as well
    return <div>Loading profile...</div>;
  }

    return (
    <div className="space-y-6">
      <div className="max-w-4xl mx-auto">
        {/* User Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User size={20} /> Personal Information</CardTitle>
            <CardDescription>Update your personal details here.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInfoSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input id="phoneNumber" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+1 (555) 123-4567" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={attributes.email || ''} disabled />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input id="jobTitle" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g., Senior Developer" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="department">Department</Label>
                  <Input id="department" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g., Engineering" />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="birthdate">Birth Date</Label>
                <Input id="birthdate" type="date" value={attributes.birthdate || ''} disabled />
              </div>
              <Button type="submit" disabled={isSavingInfo}>
                <Save className="mr-2 h-4 w-4" />
                {isSavingInfo ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Security Settings Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield size={20} /> Security</CardTitle>
            <CardDescription>Manage your password and account security.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="oldPassword">Current Password</Label>
                <Input id="oldPassword" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <Button type="submit" variant="secondary" disabled={isSavingPassword}>
                <KeyRound className="mr-2 h-4 w-4" />
                {isSavingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 