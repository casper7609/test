var enchantBrokenChance = 30;
var enchantNothingChance = 60;
var enchantSuccessChance = 100;
var enchantPriceInGold = 100;
var catalogVersion = "0.9";
function range(min, max) {
    var offset = max - min;
    return rand(0, offset) + min;
}
function rand(from, to) {
    return Math.floor((Math.random() * to) + from);
}
function hasClearedTownWithMembers(args, key)
{
	var townId = args.TownId;
	var townIdStr = "Town_" + townId;

	var userData = server.GetUserData(
		{
			"PlayFabId": currentPlayerId,
			"Keys": [
                key
            ]
		}
	);

	if (key == "TowerOfTrial") {
	    if (userData.Data.TowerOfTrial == null) {
	        return false;
	    }
	    var clearDataList = JSON.parse(userData.Data.TowerOfTrial.Value.replace(/\\/g, ""));
	    if (clearDataList == null || clearDataList.length == 0) {
	        return false;
	    }
	    return (clearDataList.indexOf(townIdStr) >= 0);
	}
	else
	{
	    if (userData.Data.ClearData == null) {
	        return false;
	    }

	    var clearDataList = JSON.parse(userData.Data.ClearData.Value.replace(/\\/g, ""));
	    if (clearDataList == null || clearDataList.length == 0) {
	        return false;
	    }
	    var clearData = null;
	    for (var i = 0; i < clearDataList.length; i++) {
	        if (clearDataList[i].Id == townIdStr) {
	            clearData = clearDataList[i];
	            break;
	        }
	    }
	    if (clearData == null) {
	        return false;
	    }

	    var clearList = clearData.ClearList;
	    if (clearList == null || clearList.length == 0) {
	        return false;
	    }

	    var partyMembers = JSON.parse(args.CharacterIds);
	    partyMembers.sort();
	    var idCombined = "";
	    for (var i = 0; i < partyMembers.length; i++) {
	        idCombined += partyMembers[i] + "_";
	    }
	    for (var i = 0; i < clearList.length; i++) {
	        if (clearList[i].Id == idCombined && clearList[i].Count >= 10) {
	            return true;
	        }
	    }
	}
	log.info("return false ");
	return false;
}
function saveClearedTownWithMembers(args, key)
{
	var townId = args.TownId;
	var townIdStr = "Town_" + townId;

	var userData = server.GetUserData(
		{
		    "PlayFabId": currentPlayerId,
		    "Keys": [
                key
		    ],
		}
	);
	var data = [];

	if (key == "TowerOfTrial") {
	    if (userData.Data.TowerOfTrial != null) {
	        data = JSON.parse(userData.Data.TowerOfTrial.Value.replace(/\\/g, ""));
	    }
	    data.push(townIdStr);
    }
	else
	{
	    var partyMembers = JSON.parse(args.CharacterIds);
	    partyMembers.sort();
	    var idCombined = "";
	    for (var i = 0; i < partyMembers.length; i++) {
	        idCombined += partyMembers[i] + "_";
	    }

	    if (userData.Data.ClearData == null) {
	        data.push({ "Id": townIdStr, "ClearList": [{ "Id": idCombined, Count: 1 }] });
	    }
	    else {
	        data = JSON.parse(userData.Data.ClearData.Value.replace(/\\/g, ""));
	        if (data.length == 0) {
	            data.push({ "Id": townIdStr, "ClearList": [{ "Id": idCombined, Count: 1 }] });
	        }
	        else {
	            var clearData = null;
	            for (var i = 0; i < data.length; i++) {
	                if (data[i].Id == townIdStr) {
	                    clearData = data[i];
	                    break;
	                }
	            }
	            if (clearData == null) {
	                data.push({ "Id": townIdStr, "ClearList": [{ "Id": idCombined, Count: 1 }] });
	            }
	            else {
	                if (clearData.ClearList.length == 0) {
	                    clearData.ClearList.push({ "Id": idCombined, Count: 1 });
	                }
	                else {
	                    var hasFound = false;
	                    for (var k = 0; k < clearData.ClearList.length; k++) {
	                        if (clearData.ClearList[k].Id == idCombined) {
	                            clearData.ClearList[k].Count++;
	                            hasFound = true;
	                            break;
	                        }
	                    }
	                    if (!hasFound) {
	                        clearData.ClearList.push({ "Id": idCombined, Count: 1 });
	                    }
	                }
	            }
	        }
	    }
	}
	var commitData = {};
	commitData[key] = JSON.stringify(data);
	server.UpdateUserData(
		{
			"PlayFabId": currentPlayerId,
			"Data": commitData
		}
	);
}
function GetHigestLevel() {
    var allCharacters = server.GetAllUsersCharacters(
         {
             "PlayFabId": currentPlayerId
         }
    );
    var higestExp = 0;
    for (var i = 0; i < allCharacters.Characters.length; i++) {
        var characterId = allCharacters.Characters[i].CharacterId;
        var charStat = server.GetCharacterStatistics(
            {
                "PlayFabId": currentPlayerId,
                "CharacterId": characterId
            }
        );
        log.info("charStat " + JSON.stringify(charStat));
        var accumulatedXP = charStat.CharacterStatistics.AccumulatedXP == null ? 0 : charStat.CharacterStatistics.AccumulatedXP;
        higestExp = Math.max(higestExp, accumulatedXP);
    }

    log.info("higestExp " + higestExp);
    var higestLevel = GetLevel(higestExp).CurrentLevel;
    log.info("higestLevel " + higestLevel);
    return higestLevel;
}
function GetLevel(accumulatedXP) {
    var currentLevel = 1;
    var currentXp = accumulatedXP;
    var xpToNextLevel = getXpToNextLevel(currentLevel);
    while (currentXp > xpToNextLevel) {
        currentLevel++;
        currentXp -= xpToNextLevel;
        xpToNextLevel = getXpToNextLevel(currentLevel);
    }
    return { "CurrentLevel": currentLevel, "CurrentXp": currentXp, "XpToNextLevel": xpToNextLevel };
}
function getXpToNextLevel(level) {
    return parseInt(((8 * level) + diff(level)) * mxp(level, 0) * rf(level));
}
function diff(level) {
    if (level <= 28) {
        return 0;
    }
    else if (level == 29) {
        return 1;
    }
    else if (level == 30) {
        return 3;
    }
    else if (level == 31) {
        return 6;
    }
    else if (level >= 32 && level <= 59) {
        return 5 * (level - 30);
    }
    return 0;
}
function mxp(level, place) {
    if (place == 0)
        return 45 + (5 * level);
    if (place == 1)
        return 235 + (5 * level);
    if (place == 2)
        return 580 + (5 * level);
    if (place == 3)
        return 1878 + (5 * level);
    return 45 + (5 * level);
}
function rf(level) {
    if (level <= 10) {
        return 1;
    }
    else if (level >= 11 && level <= 27) {
        return (1 - (level - 10) / 100);
    }
    else if (level >= 28 && level <= 59) {
        return 0.82;
    }
    else if (level >= 60) {
        return 1;
    }
    return 0;
}
handlers.SpendEnergyPoint = function (args) {
    log.info("SpendEnergyPoint called PlayFabId " + currentPlayerId);
    var userInv = server.GetUserInventory({
        "PlayFabId": currentPlayerId
    });

    var townInfoData = getTownInfo(args);

    var raidPoint = townInfoData.RaidPoint;
    var adventurePoint = townInfoData.AdventurePoint;
    if (raidPoint != null)
    {
        var currentRaidPoint = userInv.VirtualCurrency.RP;
        if (currentRaidPoint < raidPoint) {
            return { "Error": "Insufficient Energy" };
        }
        server.SubtractUserVirtualCurrency(
            {
                "PlayFabId": currentPlayerId,
                "VirtualCurrency": "RP",
                "Amount": raidPoint
            }
        );
        return { Total: (currentRaidPoint - raidPoint) };
    }
    else if (adventurePoint != null)
    {
        log.info("adventurePoint " + adventurePoint);

        var baseEnergy = userInv.VirtualCurrency.BE;
        var additionalEnergy = userInv.VirtualCurrency.AE;
        log.info("baseEnergy " + baseEnergy);
        log.info("additionalEnergy " + additionalEnergy);

        if ((baseEnergy + additionalEnergy) < adventurePoint) {
            return { "Error": "Insufficient Energy" };
        }

        if (additionalEnergy >= adventurePoint) {
            server.SubtractUserVirtualCurrency(
                {
                    "PlayFabId": currentPlayerId,
                    "VirtualCurrency": "AE",
                    "Amount": adventurePoint
                }
            );
            additionalEnergy -= adventurePoint;
        }
        else {
            //adventurePoint 10
            //additionalEnergy 4
            if (additionalEnergy > 0) {
                server.SubtractUserVirtualCurrency(
                    {
                        "PlayFabId": currentPlayerId,
                        "VirtualCurrency": "AE",
                        "Amount": additionalEnergy
                    }
                );
            }
            var beToSubtract = adventurePoint - additionalEnergy;
            //beToSubtract 6
            server.SubtractUserVirtualCurrency(
               {
                   "PlayFabId": currentPlayerId,
                   "VirtualCurrency": "BE",
                   "Amount": beToSubtract
               }
           );
            baseEnergy -= beToSubtract;
            additionalEnergy = 0;
        }
        return { Total: (additionalEnergy + baseEnergy) };
    }
};
handlers.GetEnergyPoint = function (args) {
    log.info("GetEnergyPoint called PlayFabId " + currentPlayerId);

    var userData = server.GetUserData(
        {
            "PlayFabId": currentPlayerId,
            "Keys": [
                "LastEnergyRequestTime"
            ],
        }
    );
    var currentTime = new Date().getTime();
    var lastUserCheckTime;
    if (userData.Data.LastEnergyRequestTime == null) {
        log.info("Need to add currentTime as LastEnergyRequestTime " + currentTime);
        var updatedUserData = server.UpdateUserData(
        {
            "PlayFabId": currentPlayerId,
            "Data": {
                "LastEnergyRequestTime": currentTime + ''
            }
        });
        log.info("UpdateResult " + JSON.stringify(updatedUserData));
        lastUserCheckTime = currentTime;
    }
    else {
        lastUserCheckTime = parseInt(userData.Data.LastEnergyRequestTime.Value);
        log.info("LastEnergyRequestTime " + lastUserCheckTime);
    }
    var diff = currentTime - lastUserCheckTime;
    var fiveMin = 1000 * 60 * 5;
    log.info("diff " + diff + " fiveMin " + fiveMin);

    var userInv = server.GetUserInventory({
        "PlayFabId": currentPlayerId
    });

    var highestLevel = GetHigestLevel();

    var baseEnergy = userInv.VirtualCurrency.BE;
    var baseEnergyMax = 56;
    var additionalEnergy = userInv.VirtualCurrency.AE;
    var additionalEnergyMax = highestLevel * 2;
    log.info("baseEnergy " + baseEnergy);
    log.info("baseEnergyMax " + baseEnergyMax);
    log.info("additionalEnergy " + additionalEnergy);
    log.info("additionalEnergyMax " + additionalEnergyMax);

    var countToAdd = parseInt(diff / fiveMin);
    var timeSecondsLeftTillNextGen = diff % fiveMin;
    timeSecondsLeftTillNextGen = fiveMin - timeSecondsLeftTillNextGen;
    log.info("countToAdd " + countToAdd);
    timeSecondsLeftTillNextGen = Math.ceil(timeSecondsLeftTillNextGen / 1000);
    log.info("timeLeftTillNextGen " + timeSecondsLeftTillNextGen);

    var newLastUserCheckTime = currentTime - (diff % fiveMin);
    var isUpdated = false;

    if (countToAdd > 0) {
        //need to add
        log.info("Need to add " + countToAdd);

        if (baseEnergy >= baseEnergyMax) {
            log.info("baseEnergy is full " + baseEnergy);
            if (additionalEnergy >= additionalEnergyMax) {
                log.info("additionalEnergy is full " + additionalEnergy + " nothing to do");
                isUpdated = true;
            }
            else {
                //additionalEnergy 11 / max : 20
                //9 20
                var additionalDiff = additionalEnergyMax - additionalEnergy;
                additionalDiff = Math.min(additionalDiff, countToAdd);

                server.AddUserVirtualCurrency(
                    {
                        "PlayFabId": currentPlayerId,
                        "VirtualCurrency": "AE",
                        "Amount": additionalDiff
                    }
                );

                additionalEnergy += additionalDiff;
                log.info("added " + additionalDiff + " to additionalEnergy, now " + additionalEnergy);

                isUpdated = true;
            }
        }
        else {
            //baseEnergyMax = 20
            //baseEnergy = 11
            //countToAdd = 20
            //spaceOnBase = 9
            //valueToAddToBase = 9
            //valueToAddToAdditional = 11
            var spaceOnBase = baseEnergyMax - baseEnergy;
            var valueToAddToBase = Math.min(spaceOnBase, countToAdd);
            var valueToAddToAdditional = countToAdd - valueToAddToBase;

            if (valueToAddToBase > 0) {
                server.AddUserVirtualCurrency(
                   {
                       "PlayFabId": currentPlayerId,
                       "VirtualCurrency": "BE",
                       "Amount": valueToAddToBase
                   }
                );
                baseEnergy += valueToAddToBase;
                log.info("added " + valueToAddToBase + " to baseEnergy, now " + baseEnergy);
                isUpdated = true;
            }

            var additionalDiff = additionalEnergyMax - additionalEnergy;
            additionalDiff = Math.min(additionalDiff, valueToAddToAdditional);
            if (additionalDiff > 0) {
                server.AddUserVirtualCurrency(
                   {
                       "PlayFabId": currentPlayerId,
                       "VirtualCurrency": "AE",
                       "Amount": additionalDiff
                   }
                );
                additionalEnergy += additionalDiff;
                log.info("added " + additionalDiff + " to additionalEnergy, now " + additionalEnergy);
                isUpdated = true;
            }
        }
    }
    if (isUpdated) {
        var updatedUserData = server.UpdateUserData({
            "PlayFabId": currentPlayerId,
            "Data": {
                "LastEnergyRequestTime": newLastUserCheckTime + ''
            }
        });
    }

    return { Current: (additionalEnergy + baseEnergy), Max: (baseEnergyMax + additionalEnergyMax), TimeSecondsLeftTillNextGen: timeSecondsLeftTillNextGen };
};
handlers.InvestTown = function (args) {
    log.info("InvestTown called PlayFabId " + currentPlayerId);
    var townId = args.TownId;
    var gold = args.Gold;

    var userInv = server.GetUserInventory({
        "PlayFabId": currentPlayerId
    });
    if (userInv.VirtualCurrency.GD < gold) {
        return;
    }
    var userData = server.GetUserData(
        {
            "PlayFabId": currentPlayerId,
            "Keys": [
                "Alignment"
            ],
        }
    );
    var alignment = userData.Data.Alignment.Value;
    try {
        var headers = {
            "X-MyCustomHeader": "Some Value"
        };

        var body = {
            townId: townId,
            userId: currentPlayerId,
            alignment: alignment,
            count: gold
        };

        var url = "http://52.78.158.221:8080/investment";
        var content = JSON.stringify(body);
        var httpMethod = "post";
        var contentType = "application/json";

        // The pre-defined http object makes synchronous HTTP requests
        var response = http.request(url, httpMethod, content, contentType, headers);
        log.info("response", response);
    } catch (err) {
        log.info("err", err.message);
    };
    server.SubtractUserVirtualCurrency(
        {
            "PlayFabId": currentPlayerId,
            "VirtualCurrency": "GD",
            "Amount": gold
        }
    );
};
handlers.GetMyInvestment = function (args) {
    try {
        var headers = {
            "X-MyCustomHeader": "Some Value"
        };

        var url = "http://52.78.158.221:8080/investment?townId=" + args.TownId + "&userId=" + currentPlayerId;
        var content = "";
        var httpMethod = "get";
        var contentType = "application/json";

        // The pre-defined http object makes synchronous HTTP requests
        var response = http.request(url, httpMethod, content, contentType, headers);
        log.info("response", response);
        return response;
    } catch (err) {
        log.info("err", err.message);
    };
};
handlers.InstantClearDungeon = function (args) {
    
    log.info("InstantClearDungeon " + currentPlayerId);
    
    if (!hasClearedTownWithMembers(args, "ClearData"))
    {
        log.info("hacked client " + currentPlayerId);
        return;
    }
    var townInfoData = getTownInfo(args);

    if (townInfoData == null) {
        return { "Error": "Town Not Found" };
    }
    //log.info("Got TownInfo " + townInfoData);
    var townMobs = getMonsterInfo(townInfoData);
    var tileAvg = range(townInfoData.TileMin, townInfoData.TileMax);
    log.info("tileAvg " + tileAvg);
    args.Mobs = [];
    for (var i = 0; i < townMobs.length; i++) {
        var mob = townMobs[i];
        var mobCount = mob.IsUnique ? 1 : tileAvg;
        log.info(mob.Name + " " + mobCount);
        args.Mobs.push({ "Name": mob.Name, "Count": mobCount });
    }
    args.EmblemCount = townInfoData.EmblemCount;
    args.Scrolls = [{ Name: "ScrollOfInstant", Count: range(0, 1) }, { Name: "ScrollOfExperience", Count: range(0, 1) }, { Name: "ScrollOfGold", Count: range(0, 1) }, { Name: "ScrollOfItem", Count: range(0, 1) }];
    args.ScrollOfInstantEnabled = true;
    return handlers.ClearDungeon(args);
};
function getTownInfo(args)
{
    var townId = args.TownId;
    var townIdStr = "Town_" + townId;
    var townInfo = server.GetTitleData({
        "Keys": ["Towns"]
    });;
    //log.info("test " + townInfo.Data.Towns.replace(/\\/g, ""));
    var townInfoDataList = JSON.parse(townInfo.Data.Towns.replace(/\\/g, ""));
    var townInfoData = null;
    for (var i = 0; i < townInfoDataList.length; i++) {
        if (townInfoDataList[i].Id == townId) {
            townInfoData = townInfoDataList[i];
            break;
        }
    }
    return townInfoData;
}
function getMonsterInfo(townInfoData) {
    var monsters = townInfoData.MonsterGenSequence[0].MonsterSet[0].Monsters;
    var townMobs = [];
    var titleData = server.GetTitleData({
        "Keys": ["Monsters"]
    });;
    var monsterList = JSON.parse(titleData.Data.Monsters.replace(/\\/g, ""));
    for (var i = 0; i < monsters.length ; i++)
    {
        for (var k = 0; k < monsterList.length; k++)
        {
            if(monsters[i].Name == monsterList[k].Name)
            {
                townMobs.push(monsterList[k]);
                var recent = townMobs[townMobs.length - 1];
                recent.Level = monsters[i].Level == null ? townInfoData.Level : monsters[i].Level;
                recent.Gold = monsters[i].Gold == null ? townInfoData.Gold : monsters[i].Gold;
                recent.IsUnique = monsters[i].IsUnique == null ? townInfoData.IsUnique : monsters[i].IsUnique;
                break;
            }
        }
    }
    return townMobs;
}
handlers.ClearDungeon = function (args) {
    //town1_chaotic
    //house_alignment
    //gold
    //currentPlayerId
    var result = { ScrollOfExperience: 0, ScrollOfGold: 0, ScrollOfItem: 0, ScrollOfInstant: 0 };
    var townInfoData = getTownInfo(args);

    if (townInfoData == null)
    {
        return {"Error": "Town Not Found"};
    }
    log.info("ClearDungeon " + townInfoData.DungeonMode);
    if (townInfoData.DungeonMode == 0)//NormalDungeon
    {
        result = handleNormalDungeon(args, townInfoData, result);
    }
    else if (townInfoData.DungeonMode == 1)//Raid
    {
    }
    else if (townInfoData.DungeonMode == 2)//TowerOfInfinity
    {
        handleTowerOfInfinity(args);
    }
    else if (townInfoData.DungeonMode == 3)//tower of trial
    {
        result = handleTowerOfTrial(args, townInfoData, result);
    }
    return result;
};
function handleTowerOfInfinity(args) {
    var userData = server.GetUserData(
        {
            "PlayFabId": currentPlayerId,
            "Keys": [
                "Alignment"
            ],
        }
    );
    var alignment = userData.Data.Alignment.Value;
    var highestLevel = GetHigestLevel();
    var userAccountInfo = server.GetUserAccountInfo(
        {
            "PlayFabId": currentPlayerId
        }
    );
    try {
        var headers = {};
        var body = {
            userId: currentPlayerId,
            houseName: userAccountInfo.UserInfo.TitleInfo.DisplayName,
            alignment: alignment,
            characters: args.Characters,
            highestLevel: highestLevel,
            timeInSecond: args.TimeInSecond,
            stage: args.Stage
        };
        var url = "http://52.78.158.221:8080/towerofinfinity";
        var content = JSON.stringify(body);
        var httpMethod = "post";
        var contentType = "application/json";
        var response = http.request(url, httpMethod, content, contentType, headers);
        log.info("response", response);
    } catch (err) {
        log.info("err", err.message);
    };
}
function handleTowerOfTrial(args, townInfoData, result)
{
    var hasClearedTowerOfTrial = hasClearedTownWithMembers(args, "TowerOfTrial");
    if (hasClearedTowerOfTrial)
    {
        return { "Error": "AlreadyCleared" };
    }

    var partyMembers = JSON.parse(args.CharacterIds);
    var expResult = [];
    for (var i = 0; i < partyMembers.length; i++) {
        var charStat = server.GetCharacterStatistics(
            {
                "PlayFabId": currentPlayerId,
                "CharacterId": partyMembers[i]
            }
        );
        var previousExp = charStat.CharacterStatistics.AccumulatedXP;
        //fresh character
        if (previousExp == null) {
            previousExp = 0;
        }
        var previousLevel = GetLevel(previousExp);
        expResult.push({ "CharacterId": partyMembers[i], "PreviousLevel": previousLevel, "CurrentLevel": previousLevel });
    }
    result.ExpResult = expResult;
    result.Items = [];
    var catalogItems = server.GetCatalogItems({
        "CatalogVersion": catalogVersion
    });
    var bundleItem = null;
    for (var i = 0; i < catalogItems.Catalog.length; i++) {
        var catalogItem = catalogItems.Catalog[i];
        if (catalogItem.ItemId == townInfoData.DropTable) {
            bundleItem = catalogItem;
            break;
        }
    }
    if (bundleItem == null) {
        return { "Error": "BundleItem Not Found" };
    }

    //grant townInfoData.DropTable
    var itemGrantResult = server.GrantItemsToUser(
        {
            "CatalogVersion": catalogVersion,
            "PlayFabId": currentPlayerId,
            "ItemIds": [townInfoData.DropTable]
        }
    );
    log.info("itemGrantResult " + JSON.stringify(itemGrantResult));
    result.Items = result.Items.concat(itemGrantResult["ItemGrantResults"]);

    result.TotalGem = 0;
    result.TotalAdditionalEnergy = 0;
    result.TotalEmblem = 0;
    result.TotalGold = 0;
    result.TotalExp = 0;
    result.Tax = 0;
    result.TotalAlignment = 0;

    var virtualCurrencies = bundleItem.Bundle.BundledVirtualCurrencies;
    if (virtualCurrencies != null) {
        if (virtualCurrencies.GP != null) result.TotalGem = virtualCurrencies.GP;
        if (virtualCurrencies.AE != null) result.TotalAdditionalEnergy = virtualCurrencies.AE;
        if (virtualCurrencies.EB != null) result.TotalEmblem = virtualCurrencies.EB;
        if (virtualCurrencies.GD != null) result.TotalGold = virtualCurrencies.GD;
    }
    //update player data
    saveClearedTownWithMembers(args, "TowerOfTrial");

    return result;
}
function handleNormalDungeon(args, townInfoData, result) {
    //log.info("Got TownInfo " + townInfoData);
    var townMobs = getMonsterInfo(townInfoData);
    var partyMembers = JSON.parse(args.CharacterIds);
    var mobs = args.Mobs;

    var scrolls = args.Scrolls;
    var scrollOfExperienceEnabled = args.ScrollOfExperienceEnabled;
    var scrollOfGoldEnabled = args.ScrollOfGoldEnabled;
    var scrollOfItemEnabled = args.ScrollOfItemEnabled;
    var scrollOfInstantEnabled = args.ScrollOfInstantEnabled;
    log.info("scrollOfExperienceEnabled " + scrollOfExperienceEnabled);
    log.info("scrollOfGoldEnabled " + scrollOfGoldEnabled);
    log.info("scrollOfItemEnabled " + scrollOfItemEnabled);
    log.info("scrollOfInstantEnabled " + scrollOfInstantEnabled);

    var scrollOfExperienceVer = false;
    var scrollOfGoldVer = false;
    var scrollOfItemVer = false;
    var scrollOfInstantVer = false;
    var userInv = server.GetUserInventory({
        "PlayFabId": currentPlayerId
    });

    for (var i = 0; i < userInv.Inventory.length; i++) {
        var item = userInv.Inventory[i];
        if (item.ItemClass != "Scroll") {
            continue;
        }
        log.info("scroll finding item " + JSON.stringify(item));
        if (item.ItemId == "ScrollOfExperience") {
            if (scrollOfExperienceEnabled && item.RemainingUses > 0) {
                scrollOfExperienceVer = true;
                var consumeItemResult = server.ConsumeItem({
                    "PlayFabId": currentPlayerId,
                    "ItemInstanceId": item.ItemInstanceId,
                    "ConsumeCount": 1
                });
                log.info("scrollOfExperienceVer " + scrollOfExperienceVer);
                result.ScrollOfExperience = item.RemainingUses - 1;
            }
            else {
                result.ScrollOfExperience = item.RemainingUses;
            }
        }
        if (item.ItemId == "ScrollOfGold") {
            if (scrollOfGoldEnabled && item.RemainingUses > 0) {
                scrollOfGoldVer = true;
                var consumeItemResult = server.ConsumeItem({
                    "PlayFabId": currentPlayerId,
                    "ItemInstanceId": item.ItemInstanceId,
                    "ConsumeCount": 1
                });
                log.info("scrollOfGoldVer " + scrollOfGoldVer);
                result.ScrollOfGold = item.RemainingUses - 1;
            }
            else {
                result.ScrollOfGold = item.RemainingUses;
            }
        }
        if (item.ItemId == "ScrollOfItem") {
            if (scrollOfItemEnabled && item.RemainingUses > 0) {
                scrollOfItemVer = true;
                var consumeItemResult = server.ConsumeItem({
                    "PlayFabId": currentPlayerId,
                    "ItemInstanceId": item.ItemInstanceId,
                    "ConsumeCount": 1
                });
                log.info("scrollOfItemVer " + scrollOfItemVer);
                result.ScrollOfItem = item.RemainingUses - 1;
            }
            else {
                result.ScrollOfItem = item.RemainingUses;
            }
        }
        if (item.ItemId == "ScrollOfInstant") {
            if (scrollOfInstantEnabled && item.RemainingUses > 0) {
                scrollOfInstantVer = true;
                var consumeItemResult = server.ConsumeItem({
                    "PlayFabId": currentPlayerId,
                    "ItemInstanceId": item.ItemInstanceId,
                    "ConsumeCount": 1
                });
                log.info("scrollOfInstantVer " + scrollOfInstantVer);
                result.ScrollOfInstant = item.RemainingUses - 1;
            }
            else {
                result.ScrollOfInstant = item.RemainingUses;
            }
        }
    }
    if (scrollOfExperienceEnabled && !scrollOfExperienceVer) {
        log.info("hacking scrollOfExperienceVer " + currentPlayerId);
        return;
    }
    if (scrollOfGoldEnabled && !scrollOfGoldVer) {
        log.info("hacking scrollOfGoldVer " + currentPlayerId);
        return;
    }
    if (scrollOfItemEnabled && !scrollOfItemVer) {
        log.info("hacking scrollOfItemVer " + currentPlayerId);
        return;
    }
    if (scrollOfInstantEnabled && !scrollOfInstantVer) {
        log.info("hacking scrollOfInstantVer " + currentPlayerId);
        return;
    }

    if (!scrollOfInstantEnabled) {
        saveClearedTownWithMembers(args, "ClearData");
    }

    var totalExp = 0;
    var totalGold = 0;
    var tax = 0;
    var totalAlignment = 0;
    var totalEmblem = args.EmblemCount;
    var items = [];
    for (var i = 0; i < mobs.length; i++) {
        for (var k = 0; k < townMobs.length; k++) {
            if (townMobs[k].Name == mobs[i].Name) {
                totalExp += parseInt(townMobs[k].Level * (townMobs[k].IsUnique ? 10 : 5) * mobs[i].Count);
                totalGold += parseInt(townMobs[k].Gold * mobs[i].Count);
                totalAlignment += parseInt(townMobs[k].Alignment * mobs[i].Count);
                for (var j = 0; j < mobs[i].Count; j++) {
                    try {
                        var randomItem = server.EvaluateRandomResultTable(
                            {
                                "CatalogVersion": catalogVersion,
                                "PlayFabId": currentPlayerId,
                                "TableId": townInfoData.DropTable
                            }
                        );
                        if (randomItem.ResultItemId != "Nothing") {
                            log.info("item " + JSON.stringify(randomItem));
                            items.push(randomItem.ResultItemId);
                        }
                    }
                    catch (err) {
                        log.info("create drop table for " + townInfoData.DropTable);
                    }
                }
                break;
            }
        }
    }
    log.info("scrolls " + JSON.stringify(scrolls));
    for (var i = 0; i < scrolls.length; i++) {
        for (var k = 0; k < scrolls[i].Count; k++) {
            items.push(scrolls[i].Name);
        }
    }

    var realItems = [];
    if (items.length > 0) {
        var itemDoubleCount = (scrollOfItemEnabled && scrollOfItemVer) ? 2 : 1;
        log.info("itemDoubleCount " + itemDoubleCount);
        for (var i = 0; i < itemDoubleCount; i++) {
            var itemGrantResult = server.GrantItemsToUser(
                {
                    "CatalogVersion": catalogVersion,
                    "PlayFabId": currentPlayerId,
                    "ItemIds": items
                }
            );
            realItems = realItems.concat(itemGrantResult["ItemGrantResults"]);
            log.info("realItems " + JSON.stringify(realItems));
        }
        try {
            for (var i = 0; i < realItems.length; i++) {
                if (realItems[i].ItemId == "ScrollOfExperience") {
                    result.ScrollOfExperience = realItems[i].RemainingUses;
                }
                else if (realItems[i].ItemId == "ScrollOfGold") {
                    result.ScrollOfGold = realItems[i].RemainingUses;
                }
                else if (realItems[i].ItemId == "ScrollOfItem") {
                    result.ScrollOfItem = realItems[i].RemainingUses;
                }
                else if (realItems[i].ItemId == "ScrollOfInstant") {
                    result.ScrollOfInstant = realItems[i].RemainingUses;
                }
            }
        }
        catch (err) {
            log.info("err", err.message);
        };

    }

    var expResult = [];

    if (scrollOfExperienceEnabled && scrollOfExperienceVer) {
        totalExp *= 2;
    }

    for (var i = 0; i < partyMembers.length; i++) {
        var charStat = server.GetCharacterStatistics(
            {
                "PlayFabId": currentPlayerId,
                "CharacterId": partyMembers[i]
            }
        );
        var previousExp = charStat.CharacterStatistics.AccumulatedXP;
        //fresh character
        if (previousExp == null) {
            previousExp = 0;
        }
        var previousLevel = GetLevel(previousExp);
        var currentLevel = GetLevel(previousExp + totalExp);
        server.UpdateCharacterStatistics(
            {
                "PlayFabId": currentPlayerId,
                "CharacterId": partyMembers[i],
                "CharacterStatistics": {
                    "AccumulatedXP": previousExp + totalExp,
                }
            }
        );
        expResult.push({ "CharacterId": partyMembers[i], "PreviousLevel": previousLevel, "CurrentLevel": currentLevel });
        log.info("eachExp " + totalExp + " for " + partyMembers[i]);
    }

    totalGold = parseInt(totalGold);
    if (scrollOfGoldEnabled && scrollOfGoldVer) {
        totalGold *= 2;
    }
    tax = parseInt(totalGold * 0.1);
    totalGold = totalGold - tax;

    server.AddUserVirtualCurrency(
        {
            "PlayFabId": currentPlayerId,
            "VirtualCurrency": "GD",
            "Amount": totalGold
        }
    );
    log.info("totalGold " + totalGold);
    log.info("tax " + tax);

    server.AddUserVirtualCurrency(
        {
            "PlayFabId": currentPlayerId,
            "VirtualCurrency": "EB",
            "Amount": totalEmblem
        }
    );
    log.info("totalEmblem " + totalEmblem);

    totalAlignment = parseInt(totalAlignment, 10);
    server.UpdatePlayerStatistics(
        {
            "PlayFabId": currentPlayerId,
            "Statistics": [
                {
                    "StatisticName": "Alignment",
                    "Value": totalAlignment
                }
            ]
        }
    );
    log.info("totalAlignment " + totalAlignment);

    //Town_0_Occupation
    //http://52.78.158.221:8080/occupation?townId=0&userId=playerA&alignment=Chaotic&count=1

    var userData = server.GetUserData(
        {
            "PlayFabId": currentPlayerId,
            "Keys": [
                "Alignment"
            ],
        }
    );
    var alignment = userData.Data.Alignment.Value;
    try {
        var headers = {};
        var body = {
            townId: args.TownId,
            userId: currentPlayerId,
            alignment: alignment,
            tax: tax,
            count: totalAlignment
        };

        var url = "http://52.78.158.221:8080/occupation";
        var content = JSON.stringify(body);
        var httpMethod = "post";
        var contentType = "application/json";

        // The pre-defined http object makes synchronous HTTP requests
        var response = http.request(url, httpMethod, content, contentType, headers);
        log.info("response", response);
    } catch (err) {
        log.info("err", err.message);
    };

    result.TotalExp = totalExp;
    result.ExpResult = expResult;
    result.TotalGold = totalGold;
    result.Tax = tax;
    result.TotalAlignment = totalAlignment;
    result.TotalEmblem = totalEmblem;
    result.Items = realItems;
    return result;
}
handlers.SumOccupation = function (args) {
    //Town_0_Occupation
    //http://52.78.158.221:8080/occupation?townId=0&userId=playerA&alignment=Chaotic&count=1
    try {
        var headers = {
            "X-MyCustomHeader": "Some Value"
        };

        var url = "http://52.78.158.221:8080/occupation/sum";
        var content = "";
        var httpMethod = "get";
        var contentType = "application/json";

        // The pre-defined http object makes synchronous HTTP requests
        var response = http.request(url, httpMethod, content, contentType, headers);
        log.info("response", response);
        return response;
    } catch (err) {
        log.info("err", err.message);
    };
};
handlers.TotalOccupation = function (args) {
    //Town_0_Occupation
    //http://52.78.158.221:8080/occupation?townId=0&userId=playerA&alignment=Chaotic&count=1
    try {
        var headers = {
            "X-MyCustomHeader": "Some Value"
        };

        var url = "http://52.78.158.221:8080/occupation/total";
        var content = "";
        var httpMethod = "get";
        var contentType = "application/json";

        // The pre-defined http object makes synchronous HTTP requests
        var response = http.request(url, httpMethod, content, contentType, headers);
        log.info("response", response);
        return response;
    } catch (err) {
        log.info("err", err.message);
    };
};
handlers.OccupationPerTown = function (args) {
    //Town_0_Occupation
    //http://52.78.158.221:8080/occupation?townId=0&userId=playerA&alignment=Chaotic&count=1
    try {
        var headers = {
            "X-MyCustomHeader": "Some Value"
        };

        var url = "http://52.78.158.221:8080/occupation?townId=" + args.TownId;
        var content = "";
        var httpMethod = "get";
        var contentType = "application/json";

        // The pre-defined http object makes synchronous HTTP requests
        var response = http.request(url, httpMethod, content, contentType, headers);
        log.info("response", response);
        return response;
    } catch (err) {
        log.info("err", err.message);
    };
};
handlers.EnchantItem = function (args) {
    log.info("PlayFabId " + args.PlayFabId);
    log.info("CharacterId " + args.CharacterId);
    log.info("ItemInstanceId " + args.ItemInstanceId);
    log.info("CatalogVersion " + args.CatalogVersion);

    var characterId = args.CharacterId;
    var itemInstanceId = args.ItemInstanceId;
    var catalogVersion = args.CatalogVersion;

    var userInventory = server.GetUserInventory({
        "PlayFabId": currentPlayerId
    });

    //check if sufficient fund
    if (userInventory.VirtualCurrency == null
        || userInventory.VirtualCurrency.GD == null
        || parseInt(userInventory.VirtualCurrency.GD) < enchantPriceInGold) {
        log.info("Insufficient Fund");
        return { "Error": "Insufficient Fund" };
    }

    var itemToEnchant = null;
    if (characterId == "") {
        for (var i = 0; i < userInventory.Inventory.length; i++) {
            var item = userInventory.Inventory[i];
            if (item.ItemInstanceId == args.ItemInstanceId) {
                itemToEnchant = item;
                break;
            }
        }
    }
    else {
        var characterInventory = server.GetCharacterInventory({
            "PlayFabId": currentPlayerId,
            "CharacterId": characterId,
            "CatalogVersion": catalogVersion
        });
        for (var i = 0; i < characterInventory.Inventory.length; i++) {
            var item = characterInventory.Inventory[i];
            if (item.ItemInstanceId == args.ItemInstanceId) {
                itemToEnchant = item;
                break;
            }
        }
    }

    if (itemToEnchant == null) {
        return { "Error": "Item Not Found" };
    }

    var enchantResult = 0;
    var prevEnchant = 0;
    var goldSubtractResult = null;
    goldSubtractResult = server.SubtractUserVirtualCurrency({
        "PlayFabId": currentPlayerId,
        "VirtualCurrency": "GD",
        "Amount": enchantPriceInGold
    });

    var odd = Math.floor((Math.random() * 100) + 1);
    log.info("odd " + odd);
    if (odd < enchantBrokenChance) {
        log.info("item broken");
        if (characterId == "") {
            var consumeItemResult = server.ConsumeItem({
                "PlayFabId": currentPlayerId,
                "ItemInstanceId": itemInstanceId,
                //"CharacterId": characterId,
                "ConsumeCount": 1
            });
        }
        else {
            var consumeItemResult = server.ConsumeItem({
                "PlayFabId": currentPlayerId,
                "ItemInstanceId": itemInstanceId,
                "CharacterId": characterId,
                "ConsumeCount": 1
            });
        }

        enchantResult = 0;
    }
    else if (enchantBrokenChance <= odd && odd <= enchantNothingChance) {
        log.info("nothing happened");
        enchantResult = 1;
    }
    else {
        if (itemToEnchant.CustomData != null && itemToEnchant.CustomData.Enchant != null) {
            prevEnchant = parseInt(itemToEnchant.CustomData.Enchant);
        }
        log.info("enchant success prevEnchant " + prevEnchant);
        prevEnchant++;
        log.info("enchant success current enchant " + prevEnchant);

        var enchantSuccessResult = server.UpdateUserInventoryItemCustomData({
            PlayFabId: currentPlayerId,
            CharacterId: characterId,
            ItemInstanceId: itemInstanceId,
            Data: { "Enchant": prevEnchant },
        });
        enchantResult = 2;
    }
    //1. enchant success
    //2. nothing
    //3. break
    return { "EnchantResult": enchantResult, "EnchantValue": prevEnchant, "GoldSubtractResult": goldSubtractResult };
};
handlers.CloudSellItem = function (args) {
    var characterId = args.CharacterId;
    var items = JSON.parse(args.Items);
    var catalogVersion = args.CatalogVersion;
    //log.info("characterId " + characterId);
    log.info("items " + items.length);

    var catalogItems = server.GetCatalogItems({
        "CatalogVersion": catalogVersion
    });

    var gold = 0;

    for (var k = 0; k < items.length; k++) {
        var itemId = items[k].ItemId;
        var itemInstanceId = items[k].InstanceId;
        for (var i = 0; i < catalogItems.Catalog.length; i++) {
            var catalogItem = catalogItems.Catalog[i];
            if (catalogItem.ItemId == itemId) {
                var storePrice = parseInt(catalogItem.VirtualCurrencyPrices.GD);
                if (storePrice == 0)
                    storePrice = 50;//this is basic 100 gold weapons given as default
                else
                    storePrice = storePrice / 2;
                gold += storePrice;
                log.info("gold " + gold);
                var consumeItemResult = server.ConsumeItem({
                    "PlayFabId": currentPlayerId,
                    "ItemInstanceId": itemInstanceId,
                    //"CharacterId": characterId,
                    "ConsumeCount": 1
                });
                //log.info("consumeItemResult " + JSON.parse(consumeItemResult));
                break;
            }
        }
    }


    var goldGainResult = server.AddUserVirtualCurrency(
         {
             "PlayFabId": currentPlayerId,
             "VirtualCurrency": "GD",
             "Amount": gold
         }
     );
    return { "GoldGainResult": goldGainResult, "ItemSoldResult": args.Items };
};
handlers.EquipItem = function (args) {
    //unequip
    if (args.PrevItemInstanceId != "") {
        handlers.UnEquipItem(args);
    }
    log.info("ItemToEquipInstanceId " + args.ItemToEquipInstanceId);
    //equip
    server.MoveItemToCharacterFromUser({
        "PlayFabId": args.PlayFabId,
        "CharacterId": args.CharacterId,
        "ItemInstanceId": args.ItemToEquipInstanceId
    });
};
handlers.UnEquipItem = function (args) {
    log.info("PlayFabId " + args.PlayFabId);
    log.info("CharacterId " + args.CharacterId);
    log.info("PrevItemInstanceId " + args.PrevItemInstanceId);
    server.MoveItemToUserFromCharacter({
        "PlayFabId": args.PlayFabId,
        "CharacterId": args.CharacterId,
        "ItemInstanceId": args.PrevItemInstanceId
    });
};
//called by java server
handlers.RewardRealmWar = function (args) {

    var rewardContainerId = args.RewardContainerId;
    var userIds = args.UserIds;
    var result = {"userIds":[]};
    for (var i = 0; i < userIds.length; i++)
    {
        var userId = userIds[i];
        var itemGrantResult = server.GrantItemsToUser(
            {
                "CatalogVersion": catalogVersion,
                "PlayFabId": userId,
                "ItemIds": [rewardContainerId]
            }
        );
        server.UpdateUserData(
            {
                "PlayFabId": userId,
                "Data": {
                    "Rank": rewardContainerId
                }
            }
        );
        result.userIds.push(userId);
    }
    return result;
};
handlers.GetRealmWarTime = function (args) {
    try {
        var headers = {};

        var url = "http://52.78.158.221:8080/realm/timeleft";
        var content = "";
        var httpMethod = "get";
        var contentType = "application/json";

        // The pre-defined http object makes synchronous HTTP requests
        var response = http.request(url, httpMethod, content, contentType, headers);
        log.info("response", response);
        return response;
    } catch (err) {
        log.info("err", err.message);
    };
};
handlers.GetTowerOfInfinity = function (args) {
    try {
        var headers = {};

        var url = "http://52.78.158.221:8080/towerofinfinity?userId=" + currentPlayerId;;
        var content = "";
        var httpMethod = "get";
        var contentType = "application/json";

        // The pre-defined http object makes synchronous HTTP requests
        var response = http.request(url, httpMethod, content, contentType, headers);
        log.info("response", response);
        return response;
    } catch (err) {
        log.info("err", err.message);
    };
};
// creates a standard GUID string
function CreateGUID() {
    //http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0, v = c == 'x' ? r : r & 0x3 | 0x8; return v.toString(16); });
}
