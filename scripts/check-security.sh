#!/bin/bash

# ===========================================
# Git 安全检查脚本
# ===========================================

echo "🔐 开始Git安全检查..."
echo "======================================"

# 检查是否在Git仓库中
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ 当前目录不是Git仓库"
    exit 1
fi

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查计数器
ERRORS=0
WARNINGS=0

echo -e "\n1️⃣ 检查敏感文件是否被正确忽略..."

# 敏感文件列表
SENSITIVE_FILES=(
    "wallet.json"
    "backend/wallet.json"
    "backend/.env"
    "frontend/.env"
    "*.key"
    "*.pem"
    "keypair.json"
    "authority.json"
    "private-keys/"
    "secrets/"
)

# 检查敏感文件是否被忽略
for file in "${SENSITIVE_FILES[@]}"; do
    if [[ -f "$file" || -d "$file" ]]; then
        if git check-ignore "$file" > /dev/null 2>&1; then
            echo -e "   ✅ $file ${GREEN}已被忽略${NC}"
        else
            echo -e "   ❌ $file ${RED}未被忽略 - 危险！${NC}"
            ERRORS=$((ERRORS + 1))
        fi
    fi
done

echo -e "\n2️⃣ 检查Git状态中的敏感信息..."

# 检查是否有敏感文件在待提交区域
if git status --porcelain | grep -E "(wallet\.json|\.env|\.key|\.pem|keypair\.json)"; then
    echo -e "   ❌ ${RED}发现敏感文件在Git状态中！${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "   ✅ ${GREEN}未发现敏感文件在Git状态中${NC}"
fi

echo -e "\n3️⃣ 检查.gitignore文件..."

if [[ -f ".gitignore" ]]; then
    echo -e "   ✅ ${GREEN}.gitignore 文件存在${NC}"
    
    # 检查关键忽略规则
    REQUIRED_IGNORES=(
        "wallet.json"
        "*.env"
        "*.key"
        "node_modules/"
        "*.log"
    )
    
    for ignore in "${REQUIRED_IGNORES[@]}"; do
        if grep -q "$ignore" .gitignore; then
            echo -e "   ✅ 包含规则: $ignore"
        else
            echo -e "   ⚠️ ${YELLOW}缺少规则: $ignore${NC}"
            WARNINGS=$((WARNINGS + 1))
        fi
    done
else
    echo -e "   ❌ ${RED}.gitignore 文件不存在${NC}"
    ERRORS=$((ERRORS + 1))
fi

echo -e "\n4️⃣ 检查示例文件..."

EXAMPLE_FILES=(
    "backend/wallet.example.json"
    "backend/.env.example"
)

for example in "${EXAMPLE_FILES[@]}"; do
    if [[ -f "$example" ]]; then
        echo -e "   ✅ ${GREEN}示例文件存在: $example${NC}"
    else
        echo -e "   ⚠️ ${YELLOW}示例文件缺失: $example${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
done

echo -e "\n5️⃣ 检查历史记录中的敏感信息..."

# 检查Git历史记录中是否有敏感文件
SENSITIVE_PATTERNS=(
    "wallet\.json"
    "\.env"
    "private.*key"
    "secret.*key"
)

for pattern in "${SENSITIVE_PATTERNS[@]}"; do
    if git log --all --full-history -- "*$pattern*" | head -1 > /dev/null 2>&1; then
        echo -e "   ⚠️ ${YELLOW}历史记录中可能包含敏感文件: $pattern${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
done

echo -e "\n6️⃣ 检查当前分支的远程状态..."

# 检查是否有远程仓库
if git remote -v | grep -q "origin"; then
    echo -e "   ✅ ${GREEN}检测到远程仓库${NC}"
    
    # 检查是否有未推送的提交
    if git status | grep -q "Your branch is ahead"; then
        echo -e "   ⚠️ ${YELLOW}有未推送的提交，请确保不包含敏感信息${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "   ℹ️ 未检测到远程仓库"
fi

# 汇总报告
echo -e "\n======================================"
echo -e "🔐 安全检查完成"
echo -e "======================================"

if [[ $ERRORS -eq 0 && $WARNINGS -eq 0 ]]; then
    echo -e "🎉 ${GREEN}所有检查通过！项目安全配置正确。${NC}"
    exit 0
elif [[ $ERRORS -eq 0 ]]; then
    echo -e "⚠️ ${YELLOW}检查完成，但有 $WARNINGS 个警告。${NC}"
    echo -e "建议查看上述警告并考虑修复。"
    exit 0
else
    echo -e "❌ ${RED}发现 $ERRORS 个错误和 $WARNINGS 个警告！${NC}"
    echo -e ""
    echo -e "请立即修复以下问题："
    echo -e "1. 确保所有敏感文件都在 .gitignore 中"
    echo -e "2. 从Git状态中移除敏感文件"
    echo -e "3. 检查是否需要清理Git历史记录"
    echo -e ""
    echo -e "修复命令参考："
    echo -e "git rm --cached <敏感文件>"
    echo -e "git commit -m 'Remove sensitive files'"
    exit 1
fi