#!/bin/bash
SCRIPT_PATH="./scripts/test.sh"


mainmenu () {
  echo "-> Insert number of test suite:"
  echo "1 - ShariaHubLending"
  echo "2 - ShariaHubReputation"
  echo "3 - ShariaHubBase"
  echo "4 - ShariaHubUser"
  echo "5 - ShariaHubIntegration"
  echo "x - exit program"

  read  -n 1 -p "Input Selection:" mainmenuinput
  echo ""
  if [ "$mainmenuinput" = "1" ]; then
            bash $SCRIPT_PATH test/ShariaHubLending.js ./test/helper_contracts/MockStorage.sol ./test/helper_contracts/MockReputation.sol
        elif [ "$mainmenuinput" = "2" ]; then
            bash $SCRIPT_PATH test/ShariaHubReputation.js  ./test/helper_contracts/MockStorage.sol 
        elif [ "$mainmenuinput" = "3" ]; then
            bash $SCRIPT_PATH test test/ShariaHubBase.js ./test/helper_contracts/MockStorage.sol ./test/helper_contracts/MockShariaHubContract.sol 
        elif [ "$mainmenuinput" = "4" ]; then
            bash $SCRIPT_PATH  test test/ShariaHubUser.js 
        elif [ "$mainmenuinput" = "5" ]; then
            bash $SCRIPT_PATH test test/ShariaHubIntegration.js  

        elif [ "$mainmenuinput" = "x" ];then
            exit 0
        else
            echo "You have entered an invallid selection!"
            echo "Please try again!"
            echo ""
            echo "Press any key to continue..."
            read -n 1
            clear
            mainmenu
        fi
}

mainmenu
