/**
 * InlineEdit 컴포넌트
 * 파일/폴더 이름 인라인 편집
 */

import React, { useState, useRef, useEffect, ReactElement, FormEvent, KeyboardEvent, ChangeEvent } from 'react';
import type { FileTreeNode } from '../../../../types';

interface InlineEditProps {
  node: FileTreeNode;
  onRename: (oldPath: string, newName: string) => void;
  onCancel: () => void;
}

const InlineEdit = ({ node, onRename, onCancel }: InlineEditProps): ReactElement => {
  // 확장자 분리
  const isDirectory = node.isDirectory;
  const baseName = isDirectory
    ? node.name
    : node.name.substring(0, node.name.lastIndexOf('.')) || node.name;
  const ext = isDirectory ? '' : node.name.substring(node.name.lastIndexOf('.'));

  const [name, setName] = useState<string>(baseName);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSubmittedRef = useRef<boolean>(false); // 이미 제출되었는지 추적

  useEffect(() => {
    // 자동 포커스 및 텍스트 선택
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleSubmit = (e?: FormEvent<HTMLFormElement>): void => {
    e?.preventDefault();

    // 이미 제출된 경우 중복 실행 방지
    if (isSubmittedRef.current) {
      return;
    }

    const trimmedName = name.trim();

    // 빈 이름 또는 변경 없음
    if (!trimmedName || trimmedName === baseName) {
      isSubmittedRef.current = true;
      onCancel();
      return;
    }

    // 새 이름 생성 (파일이면 확장자 추가)
    const newName = isDirectory ? trimmedName : `${trimmedName}${ext}`;
    isSubmittedRef.current = true;
    onRename(node.path, newName);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      isSubmittedRef.current = true; // blur 이벤트에서 중복 실행 방지
      onCancel();
    }
  };

  const handleBlur = (): void => {
    // 약간의 지연을 두어 클릭 이벤트가 먼저 처리되도록 함
    setTimeout(() => {
      handleSubmit();
    }, 100);
  };

  return (
    <form onSubmit={handleSubmit} className="inline-edit">
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="inline-edit-input"
      />
      {ext && <span className="inline-edit-ext">{ext}</span>}
    </form>
  );
};

export default InlineEdit;
