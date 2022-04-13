#!/usr/bin/env bash

# Exit script as soon as a command fails.
set -o errexit

# Executes cleanup function at script exit.
trap cleanup EXIT

cleanup() {
  # Kill the GSN relay server that we started (if we started one and if it's still running).
  if [ -n "$gsn_relay_server_pid" ] && ps -p $gsn_relay_server_pid > /dev/null; then
    kill $gsn_relay_server_pid
  fi

  # Kill the ganache instance that we started (if we started one and if it's still running).
  if [ -n "$ganache_pid" ] && ps -p $ganache_pid > /dev/null; then
    kill -9 $ganache_pid
  fi
}

if [ "$SOLIDITY_COVERAGE" = true ]; then
  ganache_port=8555
else
  ganache_port=8545
fi

relayer_port=8099
relayer_url="http://localhost:${relayer_port}"

ganache_running() {
  nc -z localhost "$ganache_port"
}

start_ganache() {
  # We define 12 accounts with balance 10M ether, needed for high-value tests.
  local accounts=(
    --account="0xd999042bfc9743927b214d2a9be92e32320edffb2457f2c77e51ed1bd6539c00,1000000000000000000000000"
    --account="0xd999042bfc9743927b214d2a9be92e32320edffb2457f2c77e51ed1bd6539c01,1000000000000000000000000"
    --account="0xd999042bfc9743927b214d2a9be92e32320edffb2457f2c77e51ed1bd6539c02,1000000000000000000000000"
    --account="0xd999042bfc9743927b214d2a9be92e32320edffb2457f2c77e51ed1bd6539c03,1000000000000000000000000"
    --account="0xd999042bfc9743927b214d2a9be92e32320edffb2457f2c77e51ed1bd6539c04,1000000000000000000000000"
    --account="0xd999042bfc9743927b214d2a9be92e32320edffb2457f2c77e51ed1bd6539c05,1000000000000000000000000"
    --account="0xd999042bfc9743927b214d2a9be92e32320edffb2457f2c77e51ed1bd6539c06,1000000000000000000000000"
    --account="0xd999042bfc9743927b214d2a9be92e32320edffb2457f2c77e51ed1bd6539c07,1000000000000000000000000"
    --account="0xd999042bfc9743927b214d2a9be92e32320edffb2457f2c77e51ed1bd6539c08,1000000000000000000000000"
    --account="0xd999042bfc9743927b214d2a9be92e32320edffb2457f2c77e51ed1bd6539c09,1000000000000000000000000"
    --account="0xd999042bfc9743927b214d2a9be92e32320edffb2457f2c77e51ed1bd6539c10,1000000000000000000000000"
    --account="0xd999042bfc9743927b214d2a9be92e32320edffb2457f2c77e51ed1bd6539c11,1000000000000000000000000"
    --account="0x956b91cb2344d7863ea89e6945b753ca32f6d74bb97a59e59e04903ded14ad00,1000000000000000000000000"
    --account="0x956b91cb2344d7863ea89e6945b753ca32f6d74bb97a59e59e04903ded14ad01,1000000000000000000000000"
    --account="0x956b91cb2344d7863ea89e6945b753ca32f6d74bb97a59e59e04903ded14ad02,1000000000000000000000000"
  )

  if [ "$SOLIDITY_COVERAGE" = true ]; then
    npx ganache-cli-coverage --gasLimit 0xfffffffffff --port "$ganache_port" "${accounts[@]}" > /dev/null &
  else
    npx ganache-cli --gasLimit 0xfffffffffff --port "$ganache_port" "${accounts[@]}" > /dev/null &
  fi

  echo "Waiting for ganache to launch on port "$ganache_port"..."

  while ! ganache_running; do
    sleep 0.1 # wait for 1/10 of the second before check again
  done

  ganache_pid=$!
}

setup_gsn_relay() {
  echo "Launching GSN relay server"
  gsn_relay_server_pid=$(npx oz-gsn run-relayer --ethereumNodeURL http://localhost:$ganache_port --port $relayer_port --detach --quiet)
  
  echo "GSN relay server launched!"
}

if ganache_running; then
  echo "Using existing ganache instance"
else
  echo "Starting our own ganache instance"
  start_ganache
fi

# setup_gsn_relay

if [ "$SOLIDITY_COVERAGE" = true ]; then
  npx solidity-coverage

  if [ "$CONTINUOUS_INTEGRATION" = true ]; then
    cat coverage/lcov.info | npx coveralls
  fi
else
  npx truffle test --debug "$@"
fi
