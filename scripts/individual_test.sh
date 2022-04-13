#!/bin/bash
SCRIPT_PATH="./scripts/test.sh"


mainmenu () {
  echo "-> Insert number of test suite:"
  echo "1 - ShariaHubLending"
  echo "2 - ShariaHubReputation"
  echo "3 - ShariaHubBase"
  echo "4 - ShariaHubUser"
  echo "5 - ShariaHubArbitrage"
  echo "6 - ShariaHubIntegration"
  echo "7 - ShariaHubDepositManager"
  echo "8 - ShariaHubDepositManagerV2"
  echo "x - exit program"

  read  -n 1 -p "Input Selection:" mainmenuinput
  echo ""

  if [ "$mainmenuinput" = "1" ]; then
            bash $SCRIPT_PATH test/ShariaHubLending.js
        elif [ "$mainmenuinput" = "2" ]; then
            bash $SCRIPT_PATH test/ShariaHubReputation.js
        elif [ "$mainmenuinput" = "3" ]; then
            bash $SCRIPT_PATH test/ShariaHubBase.js
        elif [ "$mainmenuinput" = "4" ]; then
            bash $SCRIPT_PATH test/ShariaHubUser.js
        elif [ "$mainmenuinput" = "5" ]; then
              bash $SCRIPT_PATH test/ShariaHubArbitrage.js
        elif [ "$mainmenuinput" = "6" ]; then
            bash $SCRIPT_PATH test/ShariaHubIntegration.js
        elif [ "$mainmenuinput" = "7" ]; then
            bash $SCRIPT_PATH test/ShariaHubDepositManager.js
        elif [ "$mainmenuinput" = "8" ]; then
            bash $SCRIPT_PATH test/ShariaHubDepositManagerV2.js
        elif [ "$mainmenuinput" = "9" ]; then
            bash $SCRIPT_PATH test/ShariaHubLoanRepayment.js

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
