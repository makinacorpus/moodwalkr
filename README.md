moodwalkr
=========

## Installation

This has been tested on Ubuntu 12.04.

Edit the configuration file located at:
```
installation/config.sh
```

All required packages will be installed by the installer. To execute it:
```
cd installation
chmod +x install.sh
./install.sh
```

## Loading data

Edit the configuration files located at:
```
routing/config.py
preprocessing/routinggraph/config.py
some variables in web/js/main.js
```

You can now run:
```
cd preprocessing/routinggraph
chmod +x update.py
./update.py -c
```

Arguments of update.py are:
```
-c  			-- Update the cost grid (mandatory the first time)
-e 		-- use a local OSM extract instead of downloading it (path in preprocessing/routinggraph/config.py)
```
