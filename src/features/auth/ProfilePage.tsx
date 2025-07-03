import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { User, Shield, Bell, Activity, KeyRound, Save } from 'lucide-react';
import { updateUserAttributes, updatePassword } from 'aws-amplify/auth';

export default function ProfilePage() {
  const { user, attributes, checkUser } = useAuth(); // <-- Get attributes from context
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSavingInfo, setIsSavingInfo] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    if (attributes) {
      setFirstName(attributes.given_name || '');
      setLastName(attributes.family_name || '');
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
    <div className="max-w-7xl mx-auto pt-0 pb-4 px-2 sm:px-4 space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account settings and preferences.</p>
      </header>
      
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {/* Left Column */}
        <div className="md:col-span-2 space-y-8">
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
                <div className="space-y-1">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={attributes.email || ''} disabled />
                </div>
                <Button type="submit" disabled={isSavingInfo}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSavingInfo ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Security Settings Card */}
          <Card>
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

        {/* Right Column */}
        <div className="space-y-8">
          {/* Preferences Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bell size={20} /> Notifications</CardTitle>
              <CardDescription>Manage how you receive notifications.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="bulk-notifications">Bulk generation complete</Label>
                <Switch id="bulk-notifications" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="template-updates">New template uploads</Label>
                <Switch id="template-updates" />
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Activity size={20}/> Recent Activity</CardTitle>
              <CardDescription>A log of your recent actions.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-100 text-green-700"><User size={14}/></div>
                  <span>Updated profile information</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-100 text-blue-700"><Save size={14}/></div>
                  <span>Generated contract for "Dr. Smith"</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-purple-100 text-purple-700"><Bell size={14}/></div>
                  <span>Uploaded new provider data</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 