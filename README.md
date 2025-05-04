# SwitchCookies

A Chrome extension for managing and switching between different cookie profiles for websites.

[中文](#中文说明) | [English](#english)

## 中文说明

SwitchCookies 是一个浏览器扩展，旨在帮助用户管理不同网站的Cookie设置，快速切换到不同的账号。

### 功能特点

- 获取、修改、保存和切换网站的Cookie
- 编辑单个Cookie的属性
- 支持获取和清除域名及其所有子域名的Cookie
- 一键清除当前网站的所有Cookie（带确认提示）
- 自动刷新页面功能
- 夜间模式支持，包括滚动条颜色优化

### 项目结构

- **manifest.json**: 扩展的配置文件，定义了扩展的基本信息和权限
- **background.js**: 后台脚本，用于处理扩展的后台逻辑
- **popup.html**: 扩展的弹出界面，用户可以通过此界面与扩展交互
- **popup.js**: 弹出界面的逻辑脚本
- **popup.css**: 弹出界面的样式文件
- **icons/**: 包含扩展的图标文件
- **images/**: 包含文档和说明的截图

### 安装

- 从release中下载crx文件安装
- 或者克隆本仓库，然后将文件夹添加到Chrome浏览器的扩展管理器中

### 使用

![扩展截图1](images/image2.png)
![扩展截图2](images/image.png)

### 贡献

欢迎提交问题和拉取请求以改进此扩展。

## English

SwitchCookies is a browser extension designed to help users manage cookie settings for different websites and quickly switch between different accounts.

### Features

- Get, modify, save, and switch between website cookies
- Edit individual cookie properties
- Support for getting and clearing cookies from all subdomains
- One-click clearing of all cookies for the current website (with confirmation)
- Auto-refresh functionality after applying cookies
- Night mode support with optimized scrollbar colors

### Project Structure

- **manifest.json**: Configuration file for the extension, defines basic information and permissions
- **background.js**: Background script for handling extension logic
- **popup.html**: Popup interface for user interaction
- **popup.js**: Logic script for the popup interface
- **popup.css**: Style file for the popup interface
- **icons/**: Contains extension icon files
- **images/**: Contains screenshots for documentation

### Installation

- Download the crx file from releases
- Or clone this repository and add the folder to Chrome's extension manager

### Usage

![Extension Screenshot 1](images/image2.png)
![Extension Screenshot 2](images/image.png)

### Contributing

Issues and pull requests are welcome to improve this extension.
