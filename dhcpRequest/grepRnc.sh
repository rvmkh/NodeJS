#!/bin/sh

CELL_NUM=$1
grep -A6 "lcell$CELL_NUM-1" ./dhcpd_1108.bcp.conf | grep 'cnhost'
