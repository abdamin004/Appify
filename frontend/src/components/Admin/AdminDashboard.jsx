import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/adminService';
import DashboardLayout from '../Layout/DashboardLayout';
import LoyaltyPartnersList from '../Loyalty/LoyaltyPartnersList';
import UserManagement from './UserManagement';
import CreateAdmin from './CreateAdmin';
import VendorApplications from './VendorApplications';
import LoyaltyApplications from './LoyaltyApplications';
import AdminNotifications from './AdminNotifications';
import CommentModeration from './CommentModeration';
import ViewEvents from './ViewEvents';
import VendorDocuments from './VendorDocuments';
import AttendeesReport from './AttendeesReport';
import SalesReport from './SalesReport';
import BlackoutDatesManagement from './BlackoutDatesManagement';

export default function AdminDashboard() {
  // Default to 'events' as requested by user ("show the first tab (browse events for example)")
  const [activeTab, setActiveTab] = useState('events');
  const [pendingCount, setPendingCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const res = await adminService.getUnreadVendorNotificationsCount(true);
        setPendingCount(res.unreadCount || 0);
      } catch (err) {
        console.error('Failed to fetch pending vendor notifications', err);
      }
    };

    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const menuItems = [
    { key: 'events', label: 'View Events', icon: '📅' },
    { key: 'users', label: 'User Management', icon: '👥' },
    { key: 'create', label: 'Create Account', icon: '➕' },
    { key: 'vendor-apps', label: 'Vendor Applications', icon: '🏪', badge: pendingCount },
    { key: 'loyalty-apps', label: 'Loyalty Applications', icon: '⭐' },
    { key: 'notifications', label: 'Notifications', icon: '🔔' },
    { key: 'comments', label: 'Comment Moderation', icon: '💬' },
    { key: 'vendor-docs', label: 'Vendor Documents', icon: '📄' },
    { key: 'attendees', label: 'Attendees Report', icon: '📊' },
    { key: 'sales', label: 'Financial Reports', icon: '💰' },
    { key: 'blackout', label: 'Blackout Dates', icon: '🛑' },
    { key: 'loyalty', label: 'Loyalty Partners', icon: '🤝' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'events':
        return <ViewEvents />;
      case 'users':
        return <UserManagement />;
      case 'create':
        return <CreateAdmin />;
      case 'vendor-apps':
        return <VendorApplications />;
      case 'loyalty-apps':
        return <LoyaltyApplications />;
      case 'notifications':
        return <AdminNotifications />;
      case 'comments':
        return <CommentModeration />;
      case 'vendor-docs':
        return <VendorDocuments />;
      case 'attendees':
        return <AttendeesReport />;
      case 'sales':
        return <SalesReport />;
      case 'blackout':
        return <BlackoutDatesManagement />;
      case 'loyalty':
        return <LoyaltyPartnersList />;
      default:
        return <ViewEvents />;
    }
  };

  return (
    <DashboardLayout menuItems={menuItems} activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="p-6">
        {renderContent()}
      </div>
    </DashboardLayout>
  );
}
