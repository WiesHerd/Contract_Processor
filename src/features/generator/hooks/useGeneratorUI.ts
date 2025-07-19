import { useState } from 'react';
import type { Provider } from '@/types/provider';

export const useGeneratorUI = () => {
  // Modal states
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [bulkAssignmentModalOpen, setBulkAssignmentModalOpen] = useState(false);
  const [sameTemplateModalOpen, setSameTemplateModalOpen] = useState(false);
  const [instructionsModalOpen, setInstructionsModalOpen] = useState(false);
  const [templateErrorModalOpen, setTemplateErrorModalOpen] = useState(false);
  const [bottomActionMenuOpen, setBottomActionMenuOpen] = useState(false);

  // UI state
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [clickedProvider, setClickedProvider] = useState<Provider | null>(null);
  const [showAssignmentHint, setShowAssignmentHint] = useState(true);

  return {
    // Modal states
    previewModalOpen,
    setPreviewModalOpen,
    bulkAssignmentModalOpen,
    setBulkAssignmentModalOpen,
    sameTemplateModalOpen,
    setSameTemplateModalOpen,
    instructionsModalOpen,
    setInstructionsModalOpen,
    templateErrorModalOpen,
    setTemplateErrorModalOpen,
    bottomActionMenuOpen,
    setBottomActionMenuOpen,

    // UI state
    showDetailedView,
    setShowDetailedView,
    clickedProvider,
    setClickedProvider,
    showAssignmentHint,
    setShowAssignmentHint,
  };
}; 