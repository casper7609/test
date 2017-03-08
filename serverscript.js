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
    else
    {
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
    }
    return result;
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

    var catalogItems = server.GetCatalogItems({
        "CatalogVersion": catalogVersion
    });

    var catalogMap = {};
    for (var i = 0; i < catalogItems.Catalog.length; i++) {
        var catalogItem = catalogItems.Catalog[i];
        catalogMap[catalogItem.ItemId] = catalogItem;
    }

    var itemRank = 0;

    if (itemToEnchant.ItemClass == "Weapon")
    {
        itemRank = parseInt(catalogMap[itemToEnchant.ItemId].Tags[1]);
    }
    else if (itemToEnchant.ItemClass == "Armor") {
        itemRank = parseInt(catalogMap[itemToEnchant.ItemId].Tags[2]);
    }

    var enchantLevel = 0;

    if (itemToEnchant.CustomData != null && itemToEnchant.CustomData.Enchant != null)
    {
        enchantLevel = parseInt(itemToEnchant.CustomData.Enchant);
    }

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
    var successAdj = parseInt((1 - (enchantLevel / (enchantLevel + 20)) - itemRank * 0.2) * 100);
    enchantNothingChance = 100 - successAdj;
    enchantBrokenChance = parseInt(enchantNothingChance / 2);
    //log.info("odd " + odd + " successAdj " + successAdj + " enchantBrokenChance " + enchantBrokenChance + " enchantNothingChance " + enchantNothingChance);

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
        //var curHighestLevel = GetHigestLevel();
        //checkLevelUpPackage(curHighestLevel);
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
        grantItems(currentPlayerId, "GP100", "30일 패키지 보상입니다. ( " + 0 + "일)");
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
                grantItems(currentPlayerId, "GP300", "30일 패키지 보상입니다. (" + tracker.Date + " 일)");
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
            grantItems(currentPlayerId, "GP200", "Lv." + i + " 레벨업 패키지 보상입니다.");
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
function grantItems(userId, items, annotation) {
    log.info("Granting: " + items);
    var parsed = Array.isArray(items) ? items : [items];

    var GrantItemsToUserRequest = {
        "CatalogVersion": catalogVersion,
        "PlayFabId": userId,
        "ItemIds": parsed,
        "Annotation": annotation
    };

    var grantItemsToUserResult = server.GrantItemsToUser(GrantItemsToUserRequest);

    log.info("Item Granted: " + JSON.stringify(grantItemsToUserResult));
    for (var i = 0; i < grantItemsToUserResult.ItemGrantResults.length; i++) {
        log.info("Item ID: " + grantItemsToUserResult.ItemGrantResults[i].ItemInstanceId);
        var updateReasonResult = server.UpdateUserInventoryItemCustomData({
            PlayFabId: userId,
            ItemInstanceId: grantItemsToUserResult.ItemGrantResults[i].ItemInstanceId,
            Data: { "Reason": annotation },
        });
    }

    return JSON.stringify(grantItemsToUserResult.ItemGrantResults);
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
    if (allChars.Characters.length < 4) {
        gemPrice = 0;
    }
    else
    {
        gemPrice = 400 * Math.pow(2, (allChars.Characters.length - 4));
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
        "Data": {"Luck":luck, "IsActive":"true"}
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
handlers.GetCurrentRanking = function (args) {
    try {
        var headers = {
            "X-MyCustomHeader": "Some Value"
        };
        var url = "http://52.78.158.221:8080/currentRank?userId=" + currentPlayerId + "&alignment=" + args.Alignment;
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
        grantItems(userId, rewardContainerId, "렐름전 보상입니다.");

        var rank = parseInt(rewardContainerId.replace("RealmReward_", "")) - 1;
        server.UpdateUserData(
            {
                "PlayFabId": userId,
                "Data": {
                    "Rank": rank
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