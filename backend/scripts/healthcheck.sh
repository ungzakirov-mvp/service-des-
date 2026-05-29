#!/bin/bash
curl -sf -o /dev/null --max-time 5 http://localhost:8000/docs
exit $?