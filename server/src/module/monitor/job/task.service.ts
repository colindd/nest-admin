import { Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Task, TASK_METADATA, TaskMetadata } from 'src/common/decorators/task.decorator';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);
  // eslint-disable-next-line @typescript-eslint/ban-types
  private readonly taskMap = new Map<string, Function>();

  constructor(private reflector: Reflector) {
    this.initializeTasks();
  }

  /**
   * 初始化任务映射
   */
  private initializeTasks() {
    const prototype = Object.getPrototypeOf(this);
    const methodNames = Object.getOwnPropertyNames(prototype).filter((name) => name !== 'constructor' && typeof prototype[name] === 'function');

    for (const methodName of methodNames) {
      const metadata: TaskMetadata = this.reflector.get(TASK_METADATA, prototype[methodName]);
      if (metadata) {
        this.taskMap.set(metadata.name, prototype[methodName].bind(this));
        this.logger.log(`注册任务: ${metadata.name}`);
      }
    }
  }

  /**
   * 获取所有已注册的任务
   */
  getTasks() {
    return Array.from(this.taskMap.keys());
  }

  /**
   * 执行任务
   * @param invokeTarget 调用目标字符串 例如: "noParams" 或 "params(1, 'test', true)"
   */
  async executeTask(invokeTarget: string) {
    try {
      // 使用正则表达式解析函数名和参数
      const regex = /^([^(]+)(?:\((.*)\))?$/;
      const match = invokeTarget.match(regex);

      if (!match) {
        throw new Error('调用目标格式错误');
      }

      const [, methodName, paramsStr] = match;
      const params = paramsStr ? this.parseParams(paramsStr) : [];

      // 获取任务方法
      const taskFn = this.taskMap.get(methodName);
      if (!taskFn) {
        throw new Error(`任务 ${methodName} 不存在`);
      }

      // 执行任务
      await taskFn(...params);
      return true;
    } catch (error) {
      this.logger.error(`执行任务失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 解析参数字符串
   * 支持以下格式:
   * - 字符串: 'text' 或 "text"
   * - 数字: 123 或 123.45
   * - 布尔值: true 或 false
   * - null
   * - undefined
   * - 数组: [1, 'text', true]
   * - 对象: {a: 1, b: 'text'}
   */
  private parseParams(paramsStr: string): any[] {
    if (!paramsStr.trim()) {
      return [];
    }

    try {
      // 将单引号替换为双引号
      const normalizedStr = paramsStr
        .replace(/'/g, '"')
        // 处理未加引号的字符串
        .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

      // 尝试解析为 JSON
      return Function(`return [${normalizedStr}]`)();
    } catch (error) {
      this.logger.error(`解析参数失败: ${error.message}`);
      return [];
    }
  }

  @Task({
    name: 'noParams',
    description: '无参示例任务',
  })
  async ryNoParams() {
    this.logger.log('执行无参示例任务');
  }

  @Task({
    name: 'params',
    description: '有参示例任务',
  })
  async ryParams(param1: string, param2: number, param3: boolean) {
    this.logger.log(`执行有参示例任务，参数：`, { param1, param2, param3 });
  }

  @Task({
    name: 'clearTemp',
    description: '清理临时文件',
  })
  async clearTemp() {
    this.logger.log('执行清理临时文件任务');
    // 实现清理临时文件的逻辑
  }

  @Task({
    name: 'monitorSystem',
    description: '系统状态监控',
  })
  async monitorSystem() {
    this.logger.log('执行系统状态监控任务');
    // 实现系统监控的逻辑
  }

  @Task({
    name: 'backupDatabase',
    description: '数据库备份',
  })
  async backupDatabase() {
    this.logger.log('执行数据库备份任务');
    // 实现数据库备份的逻辑
  }
}
