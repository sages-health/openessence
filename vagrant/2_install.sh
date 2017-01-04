#!/bin/bash
	
npm install -g gulp bower
npm install

bower cache clean
bower install --force
bower prune