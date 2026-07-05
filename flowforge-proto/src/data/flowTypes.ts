import type { FlowType } from '../types';

export const builtinFlowTypes: FlowType[] = [
  {
    id: 'dialogue',
    label: '剧情流',
    description: '对话、分支、事件驱动的剧情流程',
    status: 'active',
    builtin: true,
    version: 1,
  },
  {
    id: 'quest',
    label: '任务流',
    description: '任务链、条件触发、奖励发放的逻辑流程',
    status: 'active',
    builtin: true,
    version: 1,
  },
  {
    id: 'action',
    label: '动作流',
    description: '动画播放、音效触发、摄像机控制的序列流程',
    status: 'active',
    builtin: true,
    version: 1,
  },
];
