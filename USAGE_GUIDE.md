# FlashMintlify Language Service 使用指南

## 快速开始

### 1. 安装和激活

FlashMintlify Language Service 已集成到 FlashMintlify 扩展中，无需单独安装。当你打开包含 Mintlify 文档的工作区时，它会自动激活。

### 2. 工作区设置

**重要**: 插件会自动使用当前 VS Code 工作区，无需手动配置路径。

1. 在 VS Code 中打开你的 Mintlify 文档文件夹
2. 确保根目录下有 `mint.json` 文件
3. 插件会自动检测并开始工作

### 3. 验证插件状态

打开 VS Code 开发者工具查看控制台：
- `Help` > `Toggle Developer Tools` > `Console`
- 查找 "FlashMintlify Language Service" 相关日志

## 主要功能

### 🔄 自动更新导入语句

当你重命名或移动 `.md`/`.mdx` 文件时：

**场景**: 将 `quick-start.mdx` 重命名为 `getting-started.mdx`

**之前**:
```javascript
import Content from '/core_products/aiagent/zh/android/quick-start.mdx'
```

**之后** (自动更新):
```javascript
import Content from '/core_products/aiagent/zh/android/getting-started.mdx'
```

### 🔗 自动更新链接语句

**场景**: 移动文件到子目录

**之前**:
```markdown
[快速开始](./../quick-start.mdx)
```

**之后** (自动更新):
```markdown
[快速开始](./../guides/quick-start.mdx)
```

### ⚠️ 删除前检查

当你尝试删除被引用的文件时：

1. **检测引用**: 自动扫描所有导入和链接
2. **显示确认**: 弹出对话框显示引用详情
3. **用户选择**: 
   - 查看引用详情 → 显示具体引用位置
   - 继续删除 → 忽略引用并删除文件
   - 取消删除 → 保留文件

## 支持的语法

### 导入语句 (全局扫描)
```javascript
// ✅ 支持 - 绝对路径导入
import Content from '/core_products/aiagent/zh/android/quick-start.mdx'
import { Component } from '/shared/components/Button.mdx'

// ❌ 不支持 - 相对路径导入
import Content from './quick-start.mdx'
import Content from '../android/quick-start.mdx'
```

### 链接语句 (同实例内)
```markdown
<!-- ✅ 支持 - 相对路径链接 -->
[快速开始](./../quick-start.mdx)
[高级功能](./guides/advanced-features.mdx)

<!-- ❌ 不支持 - 绝对路径链接 -->
[快速开始](/core_products/aiagent/zh/android/quick-start.mdx)
```

## 实例配置

### docuo.config.json 示例

```json
{
  "instances": [
    {
      "id": "aiagent_android_zh",
      "path": "core_products/aiagent/zh/android",
      "routeBasePath": "aiagent-android",
      "locale": "zh"
    },
    {
      "id": "aiagent_ios_zh", 
      "path": "core_products/aiagent/zh/ios",
      "routeBasePath": "aiagent-ios",
      "locale": "zh"
    }
  ]
}
```

### 实例规则

- **导入检查**: 在整个工作区范围内查找
- **链接检查**: 仅在同一实例内查找
- **实例识别**: 基于文件路径匹配 `instance.path`

## 手动命令

通过命令面板 (`Ctrl+Shift+P`) 执行：

### `Docuo: Analyze References`
分析当前文件的引用关系
- 显示有多少文件导入/链接了当前文件
- 用于调试和验证引用关系

### `Docuo: Reload Language Service`
重新加载语言服务
- 当修改 `docuo.config.json` 后使用
- 重新扫描配置和文件结构

## 设置选项

在 VS Code 设置中：

```json
{
  "docuo.enableLanguageService": true
}
```

- `true`: 启用 Docuo Language Service (默认)
- `false`: 禁用所有自动功能

## 故障排除

### 常见问题

**Q: 插件没有自动更新引用**
- 检查文件是否为 `.md` 或 `.mdx` 格式
- 确保语法符合支持的格式
- 查看开发者控制台是否有错误信息

**Q: 删除检查不工作**
- 确保 `docuo.enableLanguageService` 为 `true`
- 检查是否正确打开了工作区文件夹
- 验证 `docuo.config.json` 文件格式正确

**Q: 配置文件未找到**
- 确保 `docuo.config.json` 在工作区根目录
- 检查文件名拼写和格式
- 使用 `Docuo: Reload Language Service` 重新加载

### 调试步骤

1. **检查工作区**: 确保在 VS Code 中正确打开了文档文件夹
2. **验证配置**: 检查 `docuo.config.json` 文件存在且格式正确
3. **查看日志**: 打开开发者工具查看控制台输出
4. **测试功能**: 使用 `Docuo: Analyze References` 测试基本功能
5. **重新加载**: 使用 `Docuo: Reload Language Service` 重新初始化

## 最佳实践

### 文件组织
- 保持清晰的目录结构
- 按实例组织文档文件
- 使用一致的命名规范

### 引用管理
- 优先使用相对路径链接 (同实例内)
- 使用绝对路径导入 (跨实例共享)
- 避免深层嵌套的相对路径

### 配置维护
- 定期检查 `docuo.config.json` 配置
- 保持实例路径与实际目录结构一致
- 及时更新配置以反映结构变化

## 技术支持

如果遇到问题：
1. 查看本指南的故障排除部分
2. 检查 VS Code 开发者控制台的错误信息
3. 确认文件和配置格式正确
4. 尝试重新加载语言服务
