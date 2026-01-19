// Using partial MermaidConfig to allow additional properties
// as const를 사용하여 리터럴 타입 보존
export const mermaidConfig = {
  startOnLoad: true,
  theme: 'default' as const,
  securityLevel: 'loose' as const,
  fontFamily: 'trebuchet ms, verdana, arial, sans-serif',
  fontSize: 14,
  // 더 나은 렌더링을 위한 설정
  flowchart: {
    htmlLabels: false,
    curve: 'basis' as const,
    padding: 12,
    nodeSpacing: 60,
    rankSpacing: 60,
    diagramPadding: 8,
    useMaxWidth: false
  },
  sequence: {
    diagramMarginX: 50,
    diagramMarginY: 10,
    actorMargin: 50,
    width: 150,
    height: 65,
    boxMargin: 10,
    boxTextMargin: 5,
    noteMargin: 10,
    messageMargin: 35,
    mirrorActors: true,
    bottomMarginAdj: 1,
    useMaxWidth: true,
    fontSize: 14
  },
  gantt: {
    titleTopMargin: 25,
    barHeight: 20,
    fontFamily: 'trebuchet ms, verdana, arial, sans-serif',
    fontSize: 14,
    fontWeight: 400,
    gridLineStartPadding: 35,
    bottomPadding: 5,
    leftPadding: 75,
    topPadding: 50
  },
  themeVariables: {
    fontSize: '16px',              // 노드(박스) 안 텍스트 크기
    edgeLabelFontSize: '13px',     // 라인 설명 텍스트 크기
    fontFamily: 'trebuchet ms, verdana, arial, sans-serif',
    lineColor: '#333333',
    primaryColor: '#ECECFF',
    primaryTextColor: '#333',
    primaryBorderColor: '#9370DB',
    secondaryColor: '#ffffde',
    tertiaryColor: '#fff'
  }
};
