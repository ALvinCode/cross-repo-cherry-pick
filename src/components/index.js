#!/bin/bash

# 定义加载动画函数
show_loading() {
  local pid=$1
  local delay=0.1
  local spinstr='|/-\'
  while [ "$(ps a | awk '{print $1}' | grep "$pid")" ]; do
    local temp=${spinstr#?}
    printf " [%c]  " "$spinstr"
    spinstr=$temp${spinstr%"$temp"}
    sleep $delay
    printf "\b\b\b\b\b\b"
  done
  printf "    \b\b\b\b"
}

# 模拟长时间运行的命令
long_running_task() {
  sleep 5  # 模拟任务
}

# 运行任务并显示加载动画
long_running_task &
task_pid=$!
show_loading $task_pid

wait $task_pid
echo "任务完成！"
