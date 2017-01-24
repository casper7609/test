var enchantBrokenChance = 30;
var enchantNothingChance = 60;
var enchantSuccessChance = 100;
var enchantPriceInGold = 100;
var catalogVersion = "0.9";
var LVL_UP_PAC = "LVL_UP_PAC";
var MON_SUB_PAC = "MON_SUB_PAC";

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
	    args.TotalGem = 0;
	    var partyMembers = JSON.parse(args.CharacterIds);
	    partyMembers.sort();
	    var idCombined = "";
	    for (var i = 0; i < partyMembers.length; i++) {
	        idCombined += partyMembers[i] + "_";
	    }

	    if (userData.Data.ClearData == null) {
	        data.push({ "Id": townIdStr, "ClearList": [{ "Id": idCombined, Count: 1 }], "TotalCount" : 1 });
	    }
	    else {
	        data = JSON.parse(userData.Data.ClearData.Value.replace(/\\/g, ""));
	        if (data.length == 0) {
	            data.push({ "Id": townIdStr, "ClearList": [{ "Id": idCombined, Count: 1 }], "TotalCount": 1 });
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
	                data.push({ "Id": townIdStr, "ClearList": [{ "Id": idCombined, Count: 1 }], "TotalCount": 1, "DungeonLevel": 0 });
	            }
	            else {
	                if (clearData.ClearList.length == 0) {
	                    clearData.ClearList.push({ "Id": idCombined, Count: 1 });
	                    clearData.TotalCount = 0;
	                    clearData.DungeonLevel = 0;
	                }
	                else {
	                    var hasFound = false;
	                    for (var k = 0; k < clearData.ClearList.length; k++) {
	                        if (clearData.ClearList[k].Id == idCombined) {
	                            clearData.ClearList[k].Count++;
	                            clearData.TotalCount++;
	                            if (args.DungeonLevel != null)
	                            {
	                                clearData.DungeonLevel = Math.max(clearData.DungeonLevel == null ? 0 : clearData.DungeonLevel, args.DungeonLevel);
	                            }
	                            if (clearData.TotalCount == 10)
	                            {
	                                clearData.TotalCount = 0;
	                                //grant some gem
	                                var gem = Math.min((parseInt(args.TownId) + 1) * 10, 100);
	                                server.AddUserVirtualCurrency(
                                        {
                                            "PlayFabId": currentPlayerId,
                                            "VirtualCurrency": "GP",
                                            "Amount": gem
                                        }
                                    );
	                                args.TotalGem = gem;
	                            }
	                            hasFound = true;
	                            break;
	                        }
	                    }
	                    if (!hasFound) {
	                        clearData.ClearList.push({ "Id": idCombined, Count: 1 });
	                        clearData.TotalCount = 0;
	                        clearData.DungeonLevel = 0;
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
    args.EmblemCount = townInfoData.EmblemCount;
    args.Scrolls = [{ Name: "ScrollOfInstant", Count: range(0, 1) }, { Name: "ScrollOfExperience", Count: range(0, 1) }, { Name: "ScrollOfGold", Count: range(0, 1) }, { Name: "ScrollOfItem", Count: range(0, 1) }];
    args.ScrollOfInstantEnabled = true;
    return handlers.ClearDungeon(args);
};
function getTownInfo(args)
{
    var townId = args.TownId;
    var townInfo = server.GetTitleData({
        "Keys": ["Towns"]
    });
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
    var townMobs = {};
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
                var recent = {};
                recent.Level = monsters[i].Level == null ? townInfoData.Level : monsters[i].Level;
                recent.Gold = monsters[i].Gold == null ? townInfoData.Gold : monsters[i].Gold;
                recent.IsUnique = monsters[i].IsUnique == null ? townInfoData.IsUnique : monsters[i].IsUnique;
                townMobs[monsters[i].Name] = recent;
                break;
            }
        }
    }
    return townMobs;
}
handlers.OpenTreasureBox = function (args) {
    //args.TownId should be int
    var denominator = 4;
    var thisTownId = "Town_" + args.TownId;
    var nextTownId = "Town_" + args.TownId;
    if (args.TownId < 4) {
        nextTownId = "Town_" + (args.TownId * 2 + 4);
    }
    else
    {
        nextTownId = "Town_" + (args.TownId + 8);
    }
    if (args.TownId >= 28 && args.TownId <= 35)
    {
        nextTownId = "Town_" + args.TownId;
    }
    log.info("thisTownId " + thisTownId);
    log.info("nextTownId " + nextTownId);
    var items = [];
    var thisTownItem = server.EvaluateRandomResultTable(
        {
            "CatalogVersion": catalogVersion,
            "PlayFabId": currentPlayerId,
            "TableId": thisTownId
        }
    );
    if (thisTownItem.ResultItemId != "Nothing") {
        log.info("item " + JSON.stringify(thisTownItem));
        items.push(thisTownItem.ResultItemId);
    }

    var nextTownItem = server.EvaluateRandomResultTable(
        {
            "CatalogVersion": catalogVersion,
            "PlayFabId": currentPlayerId,
            "TableId": nextTownId
        }
    );
    if (nextTownItem.ResultItemId != "Nothing") {
        log.info("item " + JSON.stringify(nextTownItem));
        items.push(nextTownItem.ResultItemId);
    }

    var realItems = [];
    if (items.length > 0) {
        for (var i = 0; i < items.length; i++) {
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
    }

    var result = { "Items": realItems };
    return result;
};
handlers.ClearDungeon = function (args) {
    //town1_chaotic
    //house_alignment
    //gold
    //currentPlayerId
    var result = { ScrollOfExperience: 0, ScrollOfGold: 0, ScrollOfItem: 0, ScrollOfInstant: 0, TotalGem : 0 };
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
        handleNotNormalCommon(args, townInfoData, result);
        result.Items = [];
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
                var itemGrantResult = server.GrantItemsToUser(
                    {
                        "CatalogVersion": catalogVersion,
                        "PlayFabId": currentPlayerId,
                        "ItemIds": [randomItem.ResultItemId]
                    }
                );
                result.Items = result.Items.concat(itemGrantResult["ItemGrantResults"]);
            }
        }
        catch (err) {
            log.info("create drop table for " + townInfoData.DropTable);
        }
    }
    else if (townInfoData.DungeonMode == 2)//TowerOfInfinity
    {
        handleNotNormalCommon(args, townInfoData, result);
        handleTowerOfInfinity(args);
    }
    else if (townInfoData.DungeonMode == 3)//tower of trial
    {
        result = handleTowerOfTrial(args, townInfoData, result);
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

        var virtualCurrencies = bundleItem.Bundle.BundledVirtualCurrencies;
        if (virtualCurrencies != null) {
            if (virtualCurrencies.GP != null) result.TotalGem = virtualCurrencies.GP;
            if (virtualCurrencies.AE != null) result.TotalAdditionalEnergy = virtualCurrencies.AE;
            if (virtualCurrencies.EB != null) result.TotalEmblem = virtualCurrencies.EB;
            if (virtualCurrencies.GD != null) result.TotalGold = virtualCurrencies.GD;
        }
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

    handleNotNormalCommon(args, townInfoData, result);

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
    
    var actualItemCount = 0;
    for (var i = 0; i < userInv.Inventory.length; i++) {
        var item = userInv.Inventory[i];
        if (item.ItemClass != "Scroll") {
            actualItemCount++;
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

    saveClearedTownWithMembers(args, "ClearData");

    var rewardInfo = server.GetTitleData({
        "Keys": ["Rewards"]
    });

    var rewardInfoData = JSON.parse(rewardInfo.Data.Rewards.replace(/\\/g, ""));

    var totalExp = 0;
    var totalGold = 0;
    var tax = 0;
    var totalAlignment = 0;
    var totalEmblem = args.EmblemCount;
    var items = [];

    var inventoryFull = actualItemCount > 100;
    var townTier = args.TownId < 4 ? 0 : parseInt((args.TownId - 4) / 8) + 1;
    var prevHighestLevel = GetHigestLevel();

    for (var i = 0; i < mobs.length; i++) {

        var monsterInfo = townMobs[mobs[i].Name];
        var exp = parseInt(mobs[i].Level * (monsterInfo.IsUnique ? (townInfoData.Exp * rewardInfoData.Exp * 2) : townInfoData.Exp * rewardInfoData.Exp) * mobs[i].Count);
        if(prevHighestLevel > mobs[i].Level)
        {
            var diff = prevHighestLevel - mobs[i].Level;
            exp = exp * (1 - diff / (10 + diff));
        }
        else if (prevHighestLevel < mobs[i].Level)
        {
            var diff = mobs[i].Level - prevHighestLevel;
            exp = exp * (1 + 0.05 * diff);
        }
        totalExp += exp;
        totalGold += parseInt(mobs[i].Level * (monsterInfo.IsUnique ? (townInfoData.Gold * rewardInfoData.Gold * 2) : townInfoData.Gold * rewardInfoData.Gold) * mobs[i].Count);
        totalAlignment += parseInt(mobs[i].Level * (monsterInfo.IsUnique ? (townInfoData.Alignment * rewardInfoData.Alignment * 2) : townInfoData.Alignment * rewardInfoData.Alignment) * mobs[i].Count);

        if (inventoryFull || items.length >= 3)
        {
            continue;
        }
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

    if(prevHighestLevel < 50)
    {
        var curHighestLevel = GetHigestLevel();
        if (prevHighestLevel < curHighestLevel)
        {
            checkLevelUpPackage(curHighestLevel);
        }
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
    result.TotalGem = args.TotalGem;
    return result;
}
function handleNotNormalCommon(args, townInfoData, result) {
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
    
    result.TotalGem = 0;
    result.TotalAdditionalEnergy = 0;
    result.TotalEmblem = 0;
    result.TotalGold = 0;
    result.TotalExp = 0;
    result.Tax = 0;
    result.TotalAlignment = 0;
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

       
        var response = http.request(url, httpMethod, content, contentType, headers);
        log.info("response", response);
        return response;
    } catch (err) {
        log.info("err", err.message);
    };
};
handlers.EnchantItem = function (args) {
    var characterId = args.CharacterId;
    var itemInstanceId = args.ItemInstanceId;
    var catalogVersion = args.CatalogVersion;

    var userInventory = server.GetUserInventory({
        "PlayFabId": currentPlayerId
    });

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

    var itemRank = 0;
    var actualGoldToEnchant = enchantPriceInGold * Math.pow(2, itemRank);
    var emblemToEnchant = 1 * Math.pow(2, itemRank);

    //check if sufficient fund
    if (userInventory.VirtualCurrency == null
        || userInventory.VirtualCurrency.GD == null
        || parseInt(userInventory.VirtualCurrency.GD) < actualGoldToEnchant) {
        log.info("Insufficient Fund");
        return { "Error": "Insufficient Fund" };
    }
    if (userInventory.VirtualCurrency == null
        || userInventory.VirtualCurrency.EB == null
        || parseInt(userInventory.VirtualCurrency.EB) < emblemToEnchant) {
        log.info("Insufficient Fund");
        return { "Error": "Insufficient Fund" };
    }

    var enchantResult = 0;
    var prevEnchant = 0;
    var goldSubtractResult = null;
    var emblemSubtractResult = null;
    goldSubtractResult = server.SubtractUserVirtualCurrency({
        "PlayFabId": currentPlayerId,
        "VirtualCurrency": "GD",
        "Amount": actualGoldToEnchant
    });

    emblemSubtractResult = server.SubtractUserVirtualCurrency({
        "PlayFabId": currentPlayerId,
        "VirtualCurrency": "EB",
        "Amount": emblemToEnchant
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
    return { "EnchantResult": enchantResult, "EnchantValue": prevEnchant, "GoldSubtractResult": goldSubtractResult, "EmblemSubtractResult": emblemSubtractResult };
};
handlers.InAppPurchase = function (args) {
    if (args.ItemId == "lvluppackage")
    {
        var UpdateUserReadOnlyDataRequest = {
            "PlayFabId": currentPlayerId,
            "Data": {}
        };
        UpdateUserReadOnlyDataRequest.Data[LVL_UP_PAC] = JSON.stringify({ "TransactionId": args.TransactionId });
        server.UpdateUserReadOnlyData(UpdateUserReadOnlyDataRequest);
        var curHighestLevel = GetHigestLevel();
        checkLevelUpPackage(curHighestLevel);
    }
    else if (args.ItemId == "monthlypackage")
    {
        var monUpdateUserReadOnlyDataRequest = {
            "PlayFabId": currentPlayerId,
            "Data": {}
        };
        monUpdateUserReadOnlyDataRequest.Data[MON_SUB_PAC] = JSON.stringify({
            "TransactionId": args.TransactionId,
            "Date": 1,
            "NextTime": getKoreanTomorrow()
        });
        GrantItems("GP200", "Granted for monthly subscription " + 0);
        server.UpdateUserReadOnlyData(monUpdateUserReadOnlyDataRequest);
    }
};
function getKoreanTomorrow()
{
    var currentDate = new Date();
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    currentDate.setUTCHours(15, 0, 0, 0);
    return currentDate.getTime();
}
handlers.CheckMonthlySubscription = function (args) {
    var getUserReadOnlyDataResponse = server.GetUserReadOnlyData({
        "PlayFabId": currentPlayerId,
        "Keys": [MON_SUB_PAC]
    });
    var tracker = {};
    if (getUserReadOnlyDataResponse.Data.hasOwnProperty(MON_SUB_PAC))
    {
        tracker = JSON.parse(getUserReadOnlyDataResponse.Data[MON_SUB_PAC].Value);
        var UpdateUserReadOnlyDataRequest = {
            "PlayFabId": currentPlayerId,
            "Data": {}
        };
        if (tracker.Date >= 30) {
            //delete
            UpdateUserReadOnlyDataRequest.KeysToRemove = [MON_SUB_PAC];
        }
        else//check time
        {
            var currentTime = new Date().getTime();
            //after one day
            if (tracker.NextTime < currentTime)
            {
                GrantItems("GP200", "Granted for monthly subscription " + tracker.Date);
                tracker.NextTime = getKoreanTomorrow();
                tracker.Date++;
                if (tracker.Date >= 30)
                {
                    UpdateUserReadOnlyDataRequest.KeysToRemove = [MON_SUB_PAC];
                }
                else
                {
                    UpdateUserReadOnlyDataRequest.Data[MON_SUB_PAC] = JSON.stringify(tracker);
                }
            }
        }
        server.UpdateUserReadOnlyData(UpdateUserReadOnlyDataRequest);
    }
};
function checkLevelUpPackage(curHighestLevel) {
    var getUserReadOnlyDataResponse = server.GetUserReadOnlyData({
        "PlayFabId": currentPlayerId,
        "Keys": [LVL_UP_PAC]
    });
    var tracker = {};
    if (!getUserReadOnlyDataResponse.Data.hasOwnProperty(LVL_UP_PAC)) {
        return;
    }
    else {
        tracker = JSON.parse(getUserReadOnlyDataResponse.Data[LVL_UP_PAC].Value);

        var lvlFrom = 1;
        if (tracker.Level != null) {
            lvlFrom = tracker.Level;
        }
        for (var i = lvlFrom; i < curHighestLevel; i++) {
            GrantItems("GP200", "Granted for level up to Lv. " + i);
        }

        tracker.Level = curHighestLevel;
        var UpdateUserReadOnlyDataRequest = {
            "PlayFabId": currentPlayerId,
            "Data": {}
        };
        UpdateUserReadOnlyDataRequest.Data[LVL_UP_PAC] = JSON.stringify(tracker);
        server.UpdateUserReadOnlyData(UpdateUserReadOnlyDataRequest);
    }
}
function GrantItems(items, annotation) {
    log.info("Granting: " + items);
    var parsed = Array.isArray(items) ? items : [items];

    var GrantItemsToUserRequest = {
        "CatalogVersion": catalogVersion,
        "PlayFabId": currentPlayerId,
        "ItemIds": parsed,
        "Annotation": annotation
    };

    var GrantItemsToUserResult = server.GrantItemsToUser(GrantItemsToUserRequest);
    return JSON.stringify(GrantItemsToUserResult.ItemGrantResults);
}
handlers.CloudSellItem = function (args) {
    var characterId = args.CharacterId;
    var items = JSON.parse(args.Items);
    var catalogVersion = args.CatalogVersion;

    var catalogItems = server.GetCatalogItems({
        "CatalogVersion": catalogVersion
    });

    var catalogMap = {};
    for (var i = 0; i < catalogItems.Catalog.length; i++) {
        var catalogItem = catalogItems.Catalog[i];
        catalogMap[catalogItem.ItemId] = catalogItem;
    }

    var gold = 0;
    for (var k = 0; k < items.length; k++) {
        var itemId = items[k].ItemId;
        var itemInstanceId = items[k].InstanceId;
        var catalogItem = catalogMap[itemId];
        var storePrice = parseInt(catalogItem.VirtualCurrencyPrices.GD);
        if (storePrice == 0)
            storePrice = 50;//this is basic 100 gold weapons given as default
        else
            storePrice = storePrice / 2;
        gold += storePrice;
        var consumeItemResult = server.ConsumeItem({
            "PlayFabId": currentPlayerId,
            "ItemInstanceId": itemInstanceId,
            "ConsumeCount": 1
        });
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
    var itemSwapInfoStr = args.ItemSwapInfo;
    var itemSwapInfos = JSON.parse(itemSwapInfoStr);
    for (var i = 0; i < itemSwapInfos.length; i++)
    {
        var itemSwapInfo = itemSwapInfos[i];
        //unequip
        if (itemSwapInfo.PrevItemInstanceId != "") {
            itemSwapInfo.PlayFabId = args.PlayFabId;
            itemSwapInfo.CharacterId = args.CharacterId;
            handlers.UnEquipItem(itemSwapInfo);
        }
        //equip
        server.MoveItemToCharacterFromUser({
            "PlayFabId": args.PlayFabId,
            "CharacterId": args.CharacterId,
            "ItemInstanceId": itemSwapInfo.ItemToEquipInstanceId
        });
    }
};
handlers.UnEquipItem = function (args) {
    server.MoveItemToUserFromCharacter({
        "PlayFabId": args.PlayFabId,
        "CharacterId": args.CharacterId,
        "ItemInstanceId": args.PrevItemInstanceId
    });
};
handlers.PurchaseCharacter = function (args) {
    log.info("PlayFabId " + args.PlayFabId);
    log.info("ClassType " + args.ClassType);
    log.info("ClassStatus " + args.ClassStatus);
    var classType = args.ClassType;

    var gemPrice = 0;
    var allChars = server.GetAllUsersCharacters({
        "PlayFabId": currentPlayerId
    });
    if (allChars.Characters.length < 3) {
        gemPrice = 0;
    }
    else
    {
        gemPrice = 400 * Math.pow(2, (allChars.Characters.length - 3));
    }
    log.info("gemPrice " + gemPrice);

    var userInv = server.GetUserInventory({
        "PlayFabId": currentPlayerId
    });
    var currentGem = userInv.VirtualCurrency.GP;
    if (currentGem < gemPrice) {
        return { "Error": "Insufficient Gem" };
    }
    if (gemPrice > 0)
    {
        server.SubtractUserVirtualCurrency(
            {
                "PlayFabId": currentPlayerId,
                "VirtualCurrency": "GP",
                "Amount": gemPrice
            }
        );
    }

    var grantCharResult = server.GrantCharacterToUser({
        "PlayFabId": currentPlayerId,
        "CatalogVersion": catalogVersion,
        "CharacterName": classType,
        "CharacterType": classType,
        "ItemId": classType
    });
    var characterId = grantCharResult.CharacterId;
    log.info("characterId " + characterId);
    var classStatus = JSON.parse(args.ClassStatus);
    var luck = classStatus["Luck"];
    delete classStatus["Luck"];
    server.UpdateCharacterData({
        "PlayFabId": currentPlayerId,
        "CharacterId": characterId,
        "Data": classStatus
    });
    server.UpdateCharacterData({
        "PlayFabId": currentPlayerId,
        "CharacterId": characterId,
        "Data": {"Luck":luck}
    });
    var itemId = "";
    if (classType == "Rogue")
    {
        itemId = "Dagger_00";
    }
    else if (classType == "Hunter")
    {
        itemId = "Bow_00";
    }
    else if (classType == "Warrior" || classType == "SpellSword" || classType == "Paladin")
    {
        itemId = "TwoHandSword_00";
    }
    else if (classType == "Sorcerer" || classType == "Warlock" || classType == "Priest") 
    {
        itemId = "Staff_00";
    }
    
    log.info("itemId " + itemId);
    var grantItemResult = server.GrantItemsToCharacter({
        "Annotation": "Char Creation Basic Item",
        "CatalogVersion": catalogVersion,
        "PlayFabId": currentPlayerId,
        "CharacterId": characterId,
        "ItemIds": [ itemId ]
    });
    log.info("grantItemResult " + JSON.stringify(grantItemResult));
};
handlers.SummonItem = function (args) {
    log.info("PlayFabId " + args.PlayFabId);

    var count = args.Count;
    var gemPrice = count == 11 ? 3000 : 300;
    var dropTableId = args.DropTableId;

    log.info("gemPrice " + gemPrice);

    var userInv = server.GetUserInventory({
        "PlayFabId": currentPlayerId
    });
    var currentGem = userInv.VirtualCurrency.GP;
    if (currentGem < gemPrice) {
        return { "Error": "Insufficient Gem" };
    }
    if (gemPrice > 0) {
        server.SubtractUserVirtualCurrency(
            {
                "PlayFabId": currentPlayerId,
                "VirtualCurrency": "GP",
                "Amount": gemPrice
            }
        );
    }
    var items = [];
    for (var i = 0; i < count; i++)
    {
        var randomItem = server.EvaluateRandomResultTable(
            {
                "CatalogVersion": catalogVersion,
                "PlayFabId": currentPlayerId,
                "TableId": dropTableId
            }
        );
        if (randomItem.ResultItemId != "Nothing") {
            log.info("item " + JSON.stringify(randomItem));
            items.push(randomItem.ResultItemId);
        }
    }
    if (count == 11)
    {
        var hasAnyAboveFour = false;
        for (var i = 0; i < items.length; i++)
        {
            var _str = items[i];
            var str = _str.substr(_str.length - 2, 1);
            if (parseInt(str) >= 4)
            {
                hasAnyAboveFour = true;
                break;
            }
        }
        if (!hasAnyAboveFour)
        {
            var randomItem = server.EvaluateRandomResultTable(
                {
                    "CatalogVersion": catalogVersion,
                    "PlayFabId": currentPlayerId,
                    "TableId": (dropTableId + "Bonus")
                }
            );
            items.pop();
            items.push(randomItem.ResultItemId);
        }
    }
    var realItems = [];
    var itemGrantResult = server.GrantItemsToUser(
        {
            "CatalogVersion": catalogVersion,
            "PlayFabId": currentPlayerId,
            "ItemIds": items
        }
    );
    realItems = realItems.concat(itemGrantResult["ItemGrantResults"]);
    var result = {};
    result.Items = realItems;
    return result;
};
handlers.GetRank = function (args) {
    try {
        var userData = server.GetUserData(
            {
                "PlayFabId": currentPlayerId,
                "Keys": [
                    "Alignment"
                ],
            }
        );
        var alignment = userData.Data.Alignment.Value;
        var headers = {
            "X-MyCustomHeader": "Some Value"
        };

        var url = "http://52.78.158.221:8080/rank?userId=" + currentPlayerId + "&alignment=" + alignment;
        var content = "";
        var httpMethod = "get";
        var contentType = "application/json";
        var response = http.request(url, httpMethod, content, contentType, headers);
        return response;
    } catch (err) {
        log.info("err", err.message);
    };
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
handlers.SetWinner = function (args) {
    var realm = args.Realm;
    var result = { "Realm": Realm };
    server.SetTitleData(
        {
            "Key": "PrevailingRealm",
            "Value": Realm
        }
    );
    return result;
};
handlers.GetRealmWarTime = function (args) {
    try {
        var headers = {};

        var url = "http://52.78.158.221:8080/realm/timeleft";
        var content = "";
        var httpMethod = "get";
        var contentType = "application/json";

       
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

       
        var response = http.request(url, httpMethod, content, contentType, headers);
        log.info("response", response);
        return response;
    } catch (err) {
        log.info("err", err.message);
    };
};
handlers.IncreaseSkill = function (args) {

    var charData = server.GetCharacterData({
        "PlayFabId": currentPlayerId,
        "CharacterId": args.CharacterId,
        "Keys": [
          "SkillLevelStatus"
        ]
    });

    var userInv = server.GetUserInventory({
        "PlayFabId": currentPlayerId
    });
    if (userInv.VirtualCurrency.GD < args.Gold) {
        return;
    }

    var skillLevelStatusList = JSON.parse(charData.Data.SkillLevelStatus.Value.replace(/\\/g, ""));
    for (var i = 0; i < skillLevelStatusList.length; i++) {
        if (skillLevelStatusList[i].Index == args.SkillIndex) {
            skillLevelStatusList[i].Level++;
            break;
        }
    }

    server.SubtractUserVirtualCurrency(
        {
            "PlayFabId": currentPlayerId,
            "VirtualCurrency": "GD",
            "Amount": args.Gold
        }
    );

    server.UpdateCharacterData({
        "PlayFabId": currentPlayerId,
        "CharacterId": args.CharacterId,
        "Data": {
            "SkillLevelStatus": JSON.stringify(skillLevelStatusList)
        },
    });
};