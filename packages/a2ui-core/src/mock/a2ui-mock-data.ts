export const simpleTextMock = {
  beginRendering: {
    surfaceId: "surface-001",
    root: "text-component",
  },
  surfaceUpdate: {
    surfaceId: "surface-001",
    components: [
      {
        id: "text-component",
        component: {
          Text: {
            text: {
              literalString: "Hello, A2UI!",
            },
          },
        },
      },
    ],
  },
};

// 占位：后续补充更复杂的多节点 mock
export const multipleTextMock = simpleTextMock;
