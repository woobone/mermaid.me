/**
 * 파일 트리 구성 유틸리티
 * 폴더 구조를 트리 형태로 변환
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { FileTreeNode } from '../../types';

interface FileTreeNodeInternal {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileTreeNodeInternal[] | null;
  hasChildren?: boolean;
}

/**
 * 폴더의 파일 트리 구성 - 1단계만 로드 (lazy loading)
 */
export async function buildFileTree(dirPath: string): Promise<FileTreeNodeInternal | null> {
  try {
    const stats = await fs.stat(dirPath);
    const name = path.basename(dirPath);

    // 파일인 경우
    if (!stats.isDirectory()) {
      return {
        name,
        path: dirPath,
        isDirectory: false
      };
    }

    // 폴더인 경우: 직접 자식만 로드
    const children: FileTreeNodeInternal[] = [];
    const items = await fs.readdir(dirPath);

    // 각 항목 처리
    for (const item of items) {
      if (!item.startsWith('.')) { // 숨김 파일 제외
        const itemPath = path.join(dirPath, item);
        try {
          const itemStats = await fs.stat(itemPath);

          if (itemStats.isDirectory()) {
            // 하위 폴더: children을 null로 설정 (아직 로드 안됨)
            children.push({
              name: item,
              path: itemPath,
              isDirectory: true,
              children: null,        // lazy loading: 아직 로드 안됨
              hasChildren: true      // 자식이 있을 수 있음을 표시
            });
          } else {
            // 파일
            children.push({
              name: item,
              path: itemPath,
              isDirectory: false
            });
          }
        } catch (error) {
          console.error(`Error reading ${itemPath}:`, error);
        }
      }
    }

    // 정렬: 폴더 먼저, 그 다음 파일 (알파벳 순)
    children.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) {
        return (b.isDirectory ? 1 : 0) - (a.isDirectory ? 1 : 0);
      }
      return a.name.localeCompare(b.name);
    });

    return {
      name,
      path: dirPath,
      isDirectory: true,
      children,
      hasChildren: children.length > 0
    };
  } catch (error) {
    console.error(`Error building file tree for ${dirPath}:`, error);
    return null;
  }
}

module.exports = {
  buildFileTree
};
