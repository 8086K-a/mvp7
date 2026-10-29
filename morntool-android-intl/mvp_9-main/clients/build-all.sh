#!/bin/bash

# SecureFiles 多平台客户端构建脚本
# 支持构建桌面、移动、浏览器插件和PWA应用

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# 检查依赖
check_dependencies() {
    log_info "检查构建依赖..."
    
    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装"
        exit 1
    fi
    
    # 检查 npm
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装"
        exit 1
    fi
    
    # 检查平台特定工具
    case "$(uname -s)" in
        Darwin*) # macOS
            if ! command -v xcodebuild &> /dev/null; then
                log_warning "Xcode 未安装，iOS 构建将跳过"
            fi
            ;;
        Linux*) # Linux
            if ! command -v snapcraft &> /dev/null; then
                log_warning "Snapcraft 未安装，Snap 包构建将跳过"
            fi
            ;;
        MINGW*|MSYS*|CYGWIN*) # Windows
            log_info "Windows 环境检测到"
            ;;
    esac
    
    log_success "依赖检查完成"
}

# 构建共享组件
build_shared() {
    log_step "构建共享组件..."
    
    cd shared/core
    npm install
    npm run build
    cd ../..
    
    cd shared/utils
    npm install
    npm run build
    cd ../..
    
    cd shared/types
    npm install
    npm run build
    cd ../..
    
    log_success "共享组件构建完成"
}

# 构建桌面应用
build_desktop() {
    log_step "构建桌面应用..."
    
    # Windows
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]] || [[ "$1" == "all" || "$1" == "windows" ]]; then
        log_info "构建 Windows 应用..."
        cd desktop/windows
        npm install
        npm run build:win
        cd ../..
        log_success "Windows 应用构建完成"
    fi
    
    # macOS
    if [[ "$OSTYPE" == "darwin"* ]] || [[ "$1" == "all" || "$1" == "macos" ]]; then
        log_info "构建 macOS 应用..."
        cd desktop/macos
        npm install
        npm run build:mac
        cd ../..
        log_success "macOS 应用构建完成"
    fi
    
    # Linux
    if [[ "$OSTYPE" == "linux-gnu"* ]] || [[ "$1" == "all" || "$1" == "linux" ]]; then
        log_info "构建 Linux 应用..."
        cd desktop/linux
        npm install
        npm run build:linux
        cd ../..
        log_success "Linux 应用构建完成"
    fi
}

# 构建移动应用
build_mobile() {
    log_step "构建移动应用..."
    
    # iOS
    if [[ "$OSTYPE" == "darwin"* ]] || [[ "$1" == "all" || "$1" == "ios" ]]; then
        log_info "构建 iOS 应用..."
        cd mobile/ios
        npm install
        npm run pod:install
        npm run build:ios:release
        cd ../..
        log_success "iOS 应用构建完成"
    fi
    
    # Android
    if [[ "$1" == "all" || "$1" == "android" ]]; then
        log_info "构建 Android 应用..."
        cd mobile/android
        npm install
        npm run build:android:bundle
        cd ../..
        log_success "Android 应用构建完成"
    fi
}

# 构建浏览器插件
build_extensions() {
    log_step "构建浏览器插件..."
    
    # Chrome
    if [[ "$1" == "all" || "$1" == "chrome" ]]; then
        log_info "构建 Chrome 插件..."
        cd browser-extensions/chrome
        npm install
        npm run build
        cd ../..
        log_success "Chrome 插件构建完成"
    fi
    
    # Firefox
    if [[ "$1" == "all" || "$1" == "firefox" ]]; then
        log_info "构建 Firefox 插件..."
        cd browser-extensions/firefox
        npm install
        npm run build
        cd ../..
        log_success "Firefox 插件构建完成"
    fi
    
    # Safari
    if [[ "$OSTYPE" == "darwin"* ]] || [[ "$1" == "all" || "$1" == "safari" ]]; then
        log_info "构建 Safari 插件..."
        cd browser-extensions/safari
        npm install
        npm run build
        cd ../..
        log_success "Safari 插件构建完成"
    fi
    
    # Edge
    if [[ "$1" == "all" || "$1" == "edge" ]]; then
        log_info "构建 Edge 插件..."
        cd browser-extensions/edge
        npm install
        npm run build
        cd ../..
        log_success "Edge 插件构建完成"
    fi
    
    # Opera
    if [[ "$1" == "all" || "$1" == "opera" ]]; then
        log_info "构建 Opera 插件..."
        cd browser-extensions/opera
        npm install
        npm run build
        cd ../..
        log_success "Opera 插件构建完成"
    fi
}

# 构建PWA应用
build_pwa() {
    log_step "构建PWA应用..."
    
    # Web PWA
    if [[ "$1" == "all" || "$1" == "web" ]]; then
        log_info "构建 Web PWA..."
        cd pwa/web
        npm install
        npm run build
        cd ../..
        log_success "Web PWA 构建完成"
    fi
    
    # 离线PWA
    if [[ "$1" == "all" || "$1" == "offline" ]]; then
        log_info "构建离线PWA..."
        cd pwa/offline
        npm install
        npm run build
        cd ../..
        log_success "离线PWA 构建完成"
    fi
    
    # 混合PWA
    if [[ "$1" == "all" || "$1" == "hybrid" ]]; then
        log_info "构建混合PWA..."
        cd pwa/hybrid
        npm install
        npm run build
        cd ../..
        log_success "混合PWA 构建完成"
    fi
}

# 清理构建文件
clean_builds() {
    log_step "清理构建文件..."
    
    find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
    find . -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true
    find . -name "build" -type d -exec rm -rf {} + 2>/dev/null || true
    find . -name "*.log" -type f -delete 2>/dev/null || true
    
    log_success "清理完成"
}

# 显示帮助信息
show_help() {
    echo "SecureFiles 多平台客户端构建脚本"
    echo ""
    echo "用法: $0 [选项] [目标]"
    echo ""
    echo "选项:"
    echo "  -h, --help     显示帮助信息"
    echo "  -c, --clean    清理构建文件"
    echo "  -s, --shared   仅构建共享组件"
    echo ""
    echo "目标:"
    echo "  all            构建所有客户端 (默认)"
    echo "  desktop        构建桌面应用"
    echo "  mobile         构建移动应用"
    echo "  extensions     构建浏览器插件"
    echo "  pwa            构建PWA应用"
    echo ""
    echo "桌面应用:"
    echo "  windows        构建Windows应用"
    echo "  macos          构建macOS应用"
    echo "  linux          构建Linux应用"
    echo ""
    echo "移动应用:"
    echo "  ios            构建iOS应用"
    echo "  android        构建Android应用"
    echo ""
    echo "浏览器插件:"
    echo "  chrome         构建Chrome插件"
    echo "  firefox        构建Firefox插件"
    echo "  safari         构建Safari插件"
    echo "  edge           构建Edge插件"
    echo "  opera          构建Opera插件"
    echo ""
    echo "PWA应用:"
    echo "  web            构建Web PWA"
    echo "  offline        构建离线PWA"
    echo "  hybrid         构建混合PWA"
    echo ""
    echo "示例:"
    echo "  $0             构建所有客户端"
    echo "  $0 desktop     构建所有桌面应用"
    echo "  $0 windows     构建Windows应用"
    echo "  $0 -c          清理构建文件"
}

# 主函数
main() {
    local target="all"
    local clean_only=false
    local shared_only=false
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -c|--clean)
                clean_only=true
                shift
                ;;
            -s|--shared)
                shared_only=true
                shift
                ;;
            *)
                target="$1"
                shift
                ;;
        esac
    done
    
    # 显示构建信息
    log_info "开始构建 SecureFiles 客户端"
    log_info "目标: $target"
    log_info "平台: $(uname -s)"
    log_info "Node.js: $(node --version)"
    log_info "npm: $(npm --version)"
    
    # 检查依赖
    check_dependencies
    
    # 清理模式
    if [[ "$clean_only" == true ]]; then
        clean_builds
        exit 0
    fi
    
    # 仅构建共享组件
    if [[ "$shared_only" == true ]]; then
        build_shared
        exit 0
    fi
    
    # 构建共享组件
    build_shared
    
    # 根据目标构建
    case "$target" in
        "all")
            build_desktop "all"
            build_mobile "all"
            build_extensions "all"
            build_pwa "all"
            ;;
        "desktop")
            build_desktop "all"
            ;;
        "mobile")
            build_mobile "all"
            ;;
        "extensions")
            build_extensions "all"
            ;;
        "pwa")
            build_pwa "all"
            ;;
        "windows"|"macos"|"linux")
            build_desktop "$target"
            ;;
        "ios"|"android")
            build_mobile "$target"
            ;;
        "chrome"|"firefox"|"safari"|"edge"|"opera")
            build_extensions "$target"
            ;;
        "web"|"offline"|"hybrid")
            build_pwa "$target"
            ;;
        *)
            log_error "未知目标: $target"
            show_help
            exit 1
            ;;
    esac
    
    log_success "所有构建任务完成！"
    log_info "构建输出位置:"
    log_info "  桌面应用: clients/desktop/*/dist/"
    log_info "  移动应用: clients/mobile/*/build/"
    log_info "  浏览器插件: clients/browser-extensions/*/dist/"
    log_info "  PWA应用: clients/pwa/*/dist/"
}

# 执行主函数
main "$@" 