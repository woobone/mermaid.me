/**
 * EditorPanel 컴포넌트 Props 타입
 */

import type { FileType } from '../editor';

export interface EditorPanelProps {
  diagramCode: string;
  onEditorChange: (value: string) => void;
  editorWidth?: number;
  fileType?: FileType;
  fullWidth?: boolean;
}
