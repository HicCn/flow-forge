// ── FlowForge 中文翻译字典 ──
// 覆盖范围：编辑器系统壳层 UI（不含业务节点定义）

export const zhCN = {
  common: {
    ok: '确定',
    cancel: '取消',
  },

  landing: {
    subtitle: '游戏开发节点式流程编辑器',
    newFlow: '新建流程',
    openFile: '打开文件',
    recentFiles: '最近打开',
    unknownFlowType: '无法识别的流程类型',
    openFailed: '打开文件失败',
    fileNotFound: '文件不存在或无法读取',
    unknown: '未知',
  },

  typePicker: {
    title: '新建流程',
    subtitle: '选择流程类型以确定可用的节点',
    cancel: '取消',
  },

  toolbar: {
    untitled: '未命名',
    home: '返回首页',
    new: '新建',
    save: '保存',
    saveAs: '另存为',
    export: '导出代码',
    undo: '撤销 (Ctrl+Z)',
    redo: '重做 (Ctrl+Y)',
    nodeCount: '{count} 个节点',
  },

  nodeLibrary: {
    expand: '展开节点库',
    nodes: '节点',
    search: '搜索节点...',
    collapse: '收起',
    noNodes: '无匹配节点',
    manageTypes: '管理节点类型',
  },

  propertyPanel: {
    expand: '展开属性面板',
    props: '属性',
    title: '属性',
    clickToEdit: '点击节点以编辑属性',
    nodesSelected: '已选择 {count} 个节点',
    noParams: '无可配置参数',
    writesTo: '写入参数',
    nodeId: 'ID:',
    comment: '注释',
    commentPlaceholder: '添加节点说明...',
    unsupportedType: '不支持的类型',
    fixed: '固定值',
    param: '参数引用',
    selectParam: '-- 选择参数 --',
    targetInterface: '目标流入参',
    openTargetFlow: '打开目标流',
    loading: '加载中...',
    noInputParams: '目标流无入参',
    enterValue: '输入值',
  },

  parametersPanel: {
    expand: '展开参数面板',
    params: '参数 ({count})',
    title: '参数',
    add: '添加参数',
    collapse: '收起',
    key: '键名',
    ok: '确定',
    remove: '移除',
    noParams: '暂无参数',
    markAsInput: '标记为外部调用入参',
  },

  tabs: {
    close: '关闭',
    closeOthers: '关闭其他',
    closeAll: '关闭所有',
  },

  statusBar: {
    untitled: '未命名',
    nodesEdges: '{nodeCount} 个节点，{edgeCount} 条连线',
    errors: '{count} 个错误',
    warnings: '{count} 个警告',
    noErrors: '无错误',
  },

  canvas: {
    contextMenu: {
      node: '节点',
      copy: '复制',
      delete: '删除',
    },
  },

  flowNode: {
    more: '+{count} 个',
    writes: '写入: ',
  },
};
