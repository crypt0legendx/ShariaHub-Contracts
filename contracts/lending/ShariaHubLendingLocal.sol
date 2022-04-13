//SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;


import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

import "../ShariaHubBase.sol";
import "../storage/ShariaHubStorageInterface.sol";

contract ShariaHubLendingLocal is Pausable, Ownable {
    using SafeMath for uint256;

    enum LendingState {
        Uninitialized,
        AcceptingContributions,
        ExchangingToFiat,
        AwaitingReturn,
        ProjectNotFunded,
        ContributionReturned,
        Default
    }

    uint8 public version;
    ShariaHubStorageInterface public ShariaHubStorage;

    mapping(address => Investor) public investors;
    uint256 public investorCount;
    uint256 public reclaimedContributions;
    uint256 public fundingStartTime; // Start time of contribution period in UNIX time
    uint256 public fundingEndTime; // End time of contribution period in UNIX time
    uint256 public totalContributed;

    bool public capReached;

    LendingState public state;

    uint256 public annualInterest;
    uint256 public totalLendingAmount;
    uint256 public lendingDays;
    uint256 public borrowerReturnDays;
    uint256 public initialStableCoinPerFiatRate;
    uint256 public totalLendingFiatAmount;

    address payable public borrower;
    // address payable public localNode;
    address payable public ShariaHubTeam;

    uint256 public borrowerReturnStableCoinPerFiatRate;
    uint256 public ShariahubFee;
    // uint256 public localNodeFee;

    // Interest rate is using base uint 100 and 100% 10000, this means 1% is 100
    // this guarantee we can have a 2 decimal presicion in our calculation
    uint256 public constant interestBaseUint = 100;
    uint256 public constant interestBasePercent = 10000;

    // bool public localNodeFeeReclaimed;
    bool public ShariaHubTeamFeeReclaimed;

    uint256 public returnedAmount;

    struct Investor {
        uint256 amount;
        bool isCompensated;
    }

    // Events
    event CapReached(uint endTime);
    event Contribution(uint totalContributed, address indexed investor, uint amount, uint investorsCount);
    event Compensated(address indexed contributor, uint amount);
    event StateChange(uint state);
    event InitalRateSet(uint rate);
    event ReturnRateSet(uint rate);
    event ReturnAmount(address indexed borrower, uint amount);
    event BorrowerChanged(address indexed newBorrower);
    event InvestorChanged(address indexed oldInvestor, address indexed newInvestor);
    event Reclaim(address indexed target, uint256 amount);

    modifier checkIfArbiter() {
        address arbiter = ShariaHubStorage.getAddress(keccak256(abi.encodePacked("arbiter", this)));
        require(arbiter == msg.sender, "Sender not authorized");
        _;
    }

    // modifier onlyOwnerOrLocalNode() {
    //     require(localNode == msg.sender || owner() == msg.sender,"Sender not authorized");
    //     _;
    // }

    constructor(
        uint256 _fundingStartTime,
        uint256 _fundingEndTime,
        uint256 _annualInterest,
        uint256 _totalLendingAmount,
        uint256 _lendingDays,
        uint256 _ShariahubFee,
        // uint256 _localNodeFee,
        address payable _borrower,
        // address payable _localNode,
        address payable _ShariaHubTeam,
        address _ShariaHubStorage
        )  {
        require(address(_ShariaHubStorage) != address(0), "Storage address cannot be zero address");

        ShariaHubStorage = ShariaHubStorageInterface(_ShariaHubStorage);
        version = 9;

        require(_fundingEndTime > fundingStartTime, "fundingEndTime should be later than fundingStartTime");
        require(_borrower != address(0), "No borrower set");
        require(ShariaHubStorage.getBool(keccak256(abi.encodePacked("user", "representative", _borrower))), "Borrower not registered representative");
        // require(_localNode != address(0), "No Local Node set");
        require(_ShariaHubTeam != address(0), "No ShariaHub Team set");
        // require(ShariaHubStorage.getBool(keccak256(abi.encodePacked("user", "localNode", _localNode))), "Local Node is not registered");
        require(_totalLendingAmount > 0, "_totalLendingAmount must be > 0");
        require(_lendingDays > 0, "_lendingDays must be > 0");
        require(_annualInterest > 0 && _annualInterest < 100, "_annualInterest must be between 0 and 100");

        reclaimedContributions = 0;
        borrowerReturnDays = 0;

        fundingStartTime = _fundingStartTime;
        fundingEndTime = _fundingEndTime;
        annualInterest = _annualInterest;
        totalLendingAmount = _totalLendingAmount;
        lendingDays = _lendingDays;
        ShariahubFee = _ShariahubFee;
        // localNodeFee = _localNodeFee;

        borrower = _borrower;
        // localNode = _localNode;
        ShariaHubTeam = _ShariaHubTeam;

        state = LendingState.Uninitialized;

        // Ownable.initialize(msg.sender);
        // Pausable.initialize(msg.sender);
    }

    function saveInitialParametersToStorage(
        uint256 _maxDelayDays,
        uint256 _communityMembers,
        address _community
        ) external onlyOwner {
        require(_maxDelayDays != 0, "_maxDelayDays must be > 0");
        require(state == LendingState.Uninitialized, "State must be Uninitialized");
        require(_communityMembers > 0, "_communityMembers must be > 0");
        require(ShariaHubStorage.getBool(keccak256(abi.encodePacked("user", "community", _community))), "Community is not registered");

        ShariaHubStorage.setUint(keccak256(abi.encodePacked("lending.maxDelayDays", this)), _maxDelayDays);
        ShariaHubStorage.setAddress(keccak256(abi.encodePacked("lending.community", this)), _community);
        // ShariaHubStorage.setAddress(keccak256(abi.encodePacked("lending.localNode", this)), localNode);
        ShariaHubStorage.setUint(keccak256(abi.encodePacked("lending.communityMembers", this)), _communityMembers);

        changeState(LendingState.AcceptingContributions);
    }

    function setBorrower(address payable _borrower) external checkIfArbiter {
        require(_borrower != address(0), "No borrower set");
        require(ShariaHubStorage.getBool(keccak256(abi.encodePacked("user", "representative", _borrower))), "Borrower not registered representative");

        borrower = _borrower;

        emit BorrowerChanged(borrower);
    }

    function changeInvestorAddress(address _oldInvestor, address payable _newInvestor) external checkIfArbiter {
        require(_newInvestor != address(0));
        require(ShariaHubStorage.getBool(keccak256(abi.encodePacked("user", "investor", _newInvestor))));
        require(investors[_oldInvestor].amount != 0, "OldInvestor should have invested in this project");
        require(
            investors[_newInvestor].amount == 0,
            "newInvestor should not have invested anything"
        );

        investors[_newInvestor].amount = investors[_oldInvestor].amount;
        investors[_newInvestor].isCompensated = investors[_oldInvestor].isCompensated;

        delete investors[_oldInvestor];

        emit InvestorChanged(_oldInvestor, _newInvestor);
    }

    function returnBorrowed() external payable {
        require(msg.sender == borrower, "In state AwaitingReturn only borrower can contribute");
        require(state == LendingState.AwaitingReturn, "State is not AwaitingReturn");
        require(borrowerReturnStableCoinPerFiatRate > 0, "Second exchange rate not set");

        bool projectRepayed = false;
        uint excessRepayment = 0;
        uint newReturnedAmount = 0;

        emit ReturnAmount(borrower, msg.value);

        (newReturnedAmount, projectRepayed, excessRepayment) = calculatePaymentGoal(borrowerReturnAmount(), returnedAmount, msg.value);

        returnedAmount = newReturnedAmount;

        if (projectRepayed == true) {
            borrowerReturnDays = getDaysPassedBetweenDates(fundingEndTime, block.timestamp);
            changeState(LendingState.ContributionReturned);
        }

        if (excessRepayment > 0) {
            payable(borrower).transfer(excessRepayment);
        }
    }

    // @notice Function to participate in contribution period
    //  Amounts from the same address should be added up
    //  If cap is reached, end time should be modified
    //  Funds should be transferred into multisig wallet
    // @param contributor Address
    function deposit(address payable contributor) external payable whenNotPaused {
        require(
            ShariaHubStorage.getBool(keccak256(abi.encodePacked("user", "investor", contributor))),
            "Contributor is not registered lender"
        );
        require(state == LendingState.AcceptingContributions, "state is not AcceptingContributions");
        require(isContribPeriodRunning(), "can't contribute outside contribution period");

        uint oldTotalContributed = totalContributed;
        uint newTotalContributed = 0;
        uint excessContribAmount = 0;

        (newTotalContributed, capReached, excessContribAmount) = calculatePaymentGoal(totalLendingAmount, oldTotalContributed, msg.value);

        totalContributed = newTotalContributed;

        if (capReached) {
            fundingEndTime = block.timestamp;
            emit CapReached(fundingEndTime);
        }

        if (investors[contributor].amount == 0) {
            investorCount = investorCount.add(1);
        }

        if (excessContribAmount > 0) {
            payable(contributor).transfer(excessContribAmount);
            investors[contributor].amount = investors[contributor].amount.add(msg.value).sub(excessContribAmount);
            emit Contribution(newTotalContributed, contributor, msg.value.sub(excessContribAmount), investorCount);
        } else {
            investors[contributor].amount = investors[contributor].amount.add(msg.value);
            emit Contribution(newTotalContributed, contributor, msg.value, investorCount);
        }
    }

    /**
     * After the contribution period ends unsuccesfully, this method enables the contributor
     *  to retrieve their contribution
     */
    function declareProjectNotFunded() external onlyOwner {
        require(totalContributed < totalLendingAmount);
        require(state == LendingState.AcceptingContributions);
        require(block.timestamp > fundingEndTime);

        changeState(LendingState.ProjectNotFunded);
    }

    function declareProjectDefault() external onlyOwner {
        require(state == LendingState.AwaitingReturn);
        uint maxDelayDays = getMaxDelayDays();
        require(getDelayDays(block.timestamp) >= maxDelayDays);

        ShariaHubStorage.setUint(keccak256(abi.encodePacked("lending.delayDays", this)), maxDelayDays);

        changeState(LendingState.Default);
    }

    function setborrowerReturnStableCoinPerFiatRate(uint256 _borrowerReturnStableCoinPerFiatRate) external onlyOwner {
        require(state == LendingState.AwaitingReturn, "State is not AwaitingReturn");

        borrowerReturnStableCoinPerFiatRate = _borrowerReturnStableCoinPerFiatRate;

        emit ReturnRateSet(borrowerReturnStableCoinPerFiatRate);
    }

    /**
    * Marks the initial exchange period as over (the ETH collected amount has been exchanged for local Fiat currency)
    * Sets the local currency to return, on the basis of which the interest will be calculated
    * @param _initialStableCoinPerFiatRate the rate with 2 decimals. i.e. 444.22 is 44422 , 1245.00 is 124500
    */
    function finishInitialExchangingPeriod(uint256 _initialStableCoinPerFiatRate) external onlyOwner {
        require(capReached == true, "Cap not reached");
        require(state == LendingState.ExchangingToFiat, "State is not ExchangingToFiat");

        initialStableCoinPerFiatRate = _initialStableCoinPerFiatRate;
        totalLendingFiatAmount = totalLendingAmount.mul(initialStableCoinPerFiatRate);

        emit InitalRateSet(initialStableCoinPerFiatRate);

        changeState(LendingState.AwaitingReturn);
    }

    /**
     * Method to reclaim contribution after project is declared default (% of partial funds)
     * @param  beneficiary the contributor
     *
     */
    function reclaimContributionDefault(address payable beneficiary) external {
        require(state == LendingState.Default);
        require(!investors[beneficiary].isCompensated);

        // contribution = contribution * partial_funds / total_funds
        uint256 contribution = checkInvestorReturns(beneficiary);

        require(contribution > 0);

        investors[beneficiary].isCompensated = true;
        reclaimedContributions = reclaimedContributions.add(1);

        doReclaim(beneficiary, contribution);
    }

    /**
     * Method to reclaim contribution after a project is declared as not funded
     * @param  beneficiary the contributor
     *
     */
    function reclaimContribution(address payable beneficiary) external {
        require(state == LendingState.ProjectNotFunded, "State is not ProjectNotFunded");
        require(!investors[beneficiary].isCompensated, "Contribution already reclaimed");
        uint256 contribution = investors[beneficiary].amount;
        require(contribution > 0, "Contribution is 0");

        investors[beneficiary].isCompensated = true;
        reclaimedContributions = reclaimedContributions.add(1);

        doReclaim(beneficiary, contribution);
    }

    function reclaimContributionWithInterest(address payable beneficiary) external {
        require(state == LendingState.ContributionReturned, "State is not ContributionReturned");
        require(!investors[beneficiary].isCompensated, "Lender already compensated");
        uint256 contribution = checkInvestorReturns(beneficiary);
        require(contribution > 0, "Contribution is 0");

        investors[beneficiary].isCompensated = true;
        reclaimedContributions = reclaimedContributions.add(1);

        doReclaim(beneficiary, contribution);
    }

    // function reclaimLocalNodeFee() external {
    //     require(state == LendingState.ContributionReturned, "State is not ContributionReturned");
    //     require(localNodeFeeReclaimed == false, "Local Node's fee already reclaimed");
    //     uint256 fee = totalLendingFiatAmount.mul(localNodeFee).mul(interestBaseUint).div(interestBasePercent).div(borrowerReturnStableCoinPerFiatRate);
    //     require(fee > 0, "Local Node's team fee is 0");

    //     localNodeFeeReclaimed = true;

    //     doReclaim(localNode, fee);
    // }

    function reclaimShariaHubTeamFee() external {
        require(state == LendingState.ContributionReturned, "State is not ContributionReturned");
        require(ShariaHubTeamFeeReclaimed == false, "ShariaHub team's fee already reclaimed");
        uint256 fee = totalLendingFiatAmount.mul(ShariahubFee).mul(interestBaseUint).div(interestBasePercent).div(borrowerReturnStableCoinPerFiatRate);
        require(fee > 0, "ShariaHub's team fee is 0");

        ShariaHubTeamFeeReclaimed = true;

        doReclaim(ShariaHubTeam, fee);
    }

    function reclaimLeftover() external checkIfArbiter {
        require(state == LendingState.ContributionReturned || state == LendingState.Default, "State is not ContributionReturned or Default");
        // require(localNodeFeeReclaimed, "Local Node fee is not reclaimed");
        require(ShariaHubTeamFeeReclaimed, "Team fee is not reclaimed");
        require(investorCount == reclaimedContributions, "Not all investors have reclaimed their share");

        doReclaim(ShariaHubTeam, address(this).balance);
    }

    function doReclaim(address payable target, uint256 amount) internal {
        uint256 contractBalance = address(this).balance;
        uint256 reclaimAmount = (contractBalance < amount) ? contractBalance : amount;
        
        payable(target).transfer(reclaimAmount);

        emit Reclaim(target, reclaimAmount);
    }

    

    /**
     * Calculates if a target value is reached after increment, and by how much it was surpassed.
     * @param goal the target to achieve
     * @param oldTotal the total so far after the increment
     * @param contribValue the increment
     * @return (the incremented count, not bigger than max), (goal has been reached), (excess to return)
     */
    function calculatePaymentGoal(uint goal, uint oldTotal, uint contribValue) internal pure returns(uint, bool, uint) {
        uint newTotal = oldTotal.add(contribValue);
        bool goalReached = false;
        uint excess = 0;
        if (newTotal >= goal && oldTotal < goal) {
            goalReached = true;
            excess = newTotal.sub(goal);
            contribValue = contribValue.sub(excess);
            newTotal = goal;
        }
        return (newTotal, goalReached, excess);
    }

    function sendFundsToBorrower() external onlyOwner {
        // Waiting for Exchange
        require(state == LendingState.AcceptingContributions, "State has to be AcceptingContributions");
        require(capReached, "Cap is not reached");

        changeState(LendingState.ExchangingToFiat);
        payable(borrower).transfer(totalContributed);
    }

    /**
    * Calculates days passed after defaulting
    * @param date timestamp to calculate days
    * @return day number
    */
    function getDelayDays(uint date) public view returns(uint) {
        uint lendingDaysSeconds = lendingDays * 1 days;
        uint defaultTime = fundingEndTime.add(lendingDaysSeconds);

        if (date < defaultTime) {
            return 0;
        } else {
            return getDaysPassedBetweenDates(defaultTime, date);
        }
    }

    /**
    * Calculates days passed between two dates in seconds
    * @param firstDate timestamp
    * @param lastDate timestamp
    * @return days passed
    */
    function getDaysPassedBetweenDates(uint firstDate, uint lastDate) public pure returns(uint) {
        require(firstDate <= lastDate, "lastDate must be bigger than firstDate");
        return lastDate.sub(firstDate).div(60).div(60).div(24);
    }

    // lendingInterestRate with 2 decimal
    // 15 * (lending days)/ 365 + 4% local node fee + 3% LendingDev fee
    function lendingInterestRatePercentage() public view returns(uint256){
        return annualInterest.mul(interestBaseUint)
            // current days
            .mul(getDaysPassedBetweenDates(fundingEndTime, block.timestamp)).div(365)
            // .add(localNodeFee.mul(interestBaseUint))
            .add(ShariahubFee.mul(interestBaseUint))
            .add(interestBasePercent);
    }

    // lendingInterestRate with 2 decimal
    function investorInterest() public view returns(uint256){
        return annualInterest.mul(interestBaseUint).mul(borrowerReturnDays).div(365).add(interestBasePercent);
    }

    function borrowerReturnFiatAmount() public view returns(uint256) {
        return totalLendingFiatAmount.mul(lendingInterestRatePercentage()).div(interestBasePercent);
    }

    function borrowerReturnAmount() public view returns(uint256) {
        return borrowerReturnFiatAmount().div(borrowerReturnStableCoinPerFiatRate);
    }

    function isContribPeriodRunning() public view returns(bool) {
        return fundingStartTime <= block.timestamp && fundingEndTime > block.timestamp && !capReached;
    }

    function checkInvestorContribution(address investor) public view returns(uint256){
        return investors[investor].amount;
    }

    function checkInvestorReturns(address investor) public view returns(uint256) {
        uint256 investorAmount = 0;
        if (state == LendingState.ContributionReturned) {
            investorAmount = investors[investor].amount;
            return investorAmount.mul(initialStableCoinPerFiatRate).mul(investorInterest()).div(borrowerReturnStableCoinPerFiatRate).div(interestBasePercent);
        } else if (state == LendingState.Default){
            investorAmount = investors[investor].amount;
            // contribution = contribution * partial_funds / total_funds
            return investorAmount.mul(returnedAmount).div(totalLendingAmount);
        } else {
            return 0;
        }
    }

    function getMaxDelayDays() public view returns(uint256){
        return ShariaHubStorage.getUint(keccak256(abi.encodePacked("lending.maxDelayDays", this)));
    }

    function getUserContributionReclaimStatus(address userAddress) public view returns(bool isCompensated){
        return investors[userAddress].isCompensated;
    }

    function changeState(LendingState newState) internal {
        state = newState;
        emit StateChange(uint(newState));
    }
}
