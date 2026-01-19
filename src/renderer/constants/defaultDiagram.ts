export const defaultDiagram = `graph TD
    A[시작] --> B{결정}
    B -->|예| C[액션 1]
    B -->|아니오| D[액션 2]
    C --> E[끝]
    D --> E`;
