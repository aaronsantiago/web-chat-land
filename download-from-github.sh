#!/bin/bash
wget https://github.com/kleutzinger/the-lounge/archive/master.zip
unzip master.zip
mv the-lounge-master/* ./
rm -rf the-lounge-master master.zip
