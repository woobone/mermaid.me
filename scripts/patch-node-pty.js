#!/usr/bin/env node
/**
 * node-pty 패치 스크립트
 *
 * 문제: node-pty의 unixTerminal.js에서 helperPath를 계산할 때
 *       'app.asar'를 'app.asar.unpacked'로 변환하는데,
 *       이미 'app.asar.unpacked' 경로인 경우 'app.asar.unpacked.unpacked'가 됨
 *
 * 해결: replace 전에 이미 unpacked 경로인지 확인
 */

const fs = require('fs');
const path = require('path');

const unixTerminalPath = path.join(
  __dirname,
  '../node_modules/@homebridge/node-pty-prebuilt-multiarch/lib/unixTerminal.js'
);

// 파일이 존재하는지 확인
if (!fs.existsSync(unixTerminalPath)) {
  console.log('[patch-node-pty] unixTerminal.js not found, skipping patch');
  process.exit(0);
}

let content = fs.readFileSync(unixTerminalPath, 'utf8');

// 이미 패치되었는지 확인
if (content.includes("!helperPath.includes('app.asar.unpacked')")) {
  console.log('[patch-node-pty] Already patched, skipping');
  process.exit(0);
}

// 기존 코드 패턴
const oldPattern = `helperPath = path.resolve(__dirname, helperPath);
helperPath = helperPath.replace('app.asar', 'app.asar.unpacked');
helperPath = helperPath.replace('node_modules.asar', 'node_modules.asar.unpacked');`;

// 수정된 코드
const newPattern = `helperPath = path.resolve(__dirname, helperPath);
// Fix: Only replace 'app.asar' if it's not already 'app.asar.unpacked'
if (!helperPath.includes('app.asar.unpacked')) {
  helperPath = helperPath.replace('app.asar', 'app.asar.unpacked');
}
if (!helperPath.includes('node_modules.asar.unpacked')) {
  helperPath = helperPath.replace('node_modules.asar', 'node_modules.asar.unpacked');
}`;

if (content.includes(oldPattern)) {
  content = content.replace(oldPattern, newPattern);
  fs.writeFileSync(unixTerminalPath, content, 'utf8');
  console.log('[patch-node-pty] Successfully patched unixTerminal.js');
} else {
  console.log('[patch-node-pty] Pattern not found, checking alternative patterns...');

  // 대안: 줄바꿈이 다른 경우
  const altOldPattern = "helperPath = helperPath.replace('app.asar', 'app.asar.unpacked');";
  const altNewPattern = `// Fix: Only replace 'app.asar' if it's not already 'app.asar.unpacked'
if (!helperPath.includes('app.asar.unpacked')) {
  helperPath = helperPath.replace('app.asar', 'app.asar.unpacked');
}`;

  if (content.includes(altOldPattern) && !content.includes("!helperPath.includes('app.asar.unpacked')")) {
    content = content.replace(altOldPattern, altNewPattern);

    // node_modules.asar도 처리
    const altOldPattern2 = "helperPath = helperPath.replace('node_modules.asar', 'node_modules.asar.unpacked');";
    const altNewPattern2 = `if (!helperPath.includes('node_modules.asar.unpacked')) {
  helperPath = helperPath.replace('node_modules.asar', 'node_modules.asar.unpacked');
}`;
    content = content.replace(altOldPattern2, altNewPattern2);

    fs.writeFileSync(unixTerminalPath, content, 'utf8');
    console.log('[patch-node-pty] Successfully patched unixTerminal.js (alternative pattern)');
  } else {
    console.log('[patch-node-pty] Could not find pattern to patch');
  }
}
