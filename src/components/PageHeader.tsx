import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  rightContent?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, rightContent }) => (
  <div className="bg-white rounded-lg shadow-sm px-4 pt-6 pb-4 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {description && <p className="text-gray-500 text-sm mt-1">{description}</p>}
    </div>
    {rightContent && <div>{rightContent}</div>}
  </div>
); 