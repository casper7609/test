var openGames = "Async_LFG_Queue"; // put new and partial games here
var fullGames = "Async_IP_Queue"; // put full and complete games here

var enchantBrokenChance = 30;
var enchantNothingChance = 60;
var enchantSuccessChance = 100;
var enchantPriceInGold = 100;
var catalogVersion = "0.9";
function range(min, max)
{
    var offset = max - min;
    return rand(0, offset) + min;
}
function rand(from, to) {
    return Math.floor((Math.random() * to) + from);
}

//Town_0_Occupy
handlers.OccupyTown = function (args) {
    log.info("OccupyTown called PlayFabId " + currentPlayerId);
    var townId = args.TownId;
    var townIdStr = "Town_" + townId;
    
};

//Town_0_Invest
handlers.InvestTown = function (args) {
    log.info("InvestTown called PlayFabId " + currentPlayerId);
    var townId = args.TownId;
    var gold = args.Gold;

    var userInv = server.GetUserInventory({
        "PlayFabId": currentPlayerId
    });
    if (userInv.VirtualCurrency.GD < gold)
    {
        return;
    }
    //server.UpdatePlayerStatistics(
    //    {
    //        "PlayFabId": currentPlayerId,
    //        "Statistics": [
    //            {
    //                "StatisticName": townIdStr,
    //                "Value": gold
    //            }
    //        ]
    //    }
    //);
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

handlers.InstantClearDungeon = function (args) {
    var townId = args.TownId;
    var townIdStr = "Town_" + townId;
    var townInfo = server.GetTitleData({
        "Keys": [townIdStr]
    });;
    var townInfoData = townInfo.Data;
    townInfoData = townInfoData[townIdStr];
    townInfoData = JSON.parse(townInfoData);
    //log.info("Got TownInfo " + townInfoData);
    var mobs = townInfoData.Mobs;
    var tileAvg = range(townInfoData.TileMin, townInfoData.TileMax);
    log.info("tileAvg " + tileAvg);
    args.Mobs = [];
    for (var i = 0; i < mobs.length; i++) {
        var mob = mobs[i];
        var spawnCountPerTile = range(mob.SpawnMinCountPerTile, mob.SpawnMaxCountPerTile);
        log.info(mob.Name + " " + spawnCountPerTile);
        var mobCount = mob.IsUnique ? mob.SpawnRatePerDungeon * spawnCountPerTile : tileAvg * mob.SpawnRatePerTile * spawnCountPerTile;
        log.info(mob.Name + " " + mobCount);
        args.Mobs.push({"Name":mob.Name, "Count":mobCount});
    }
    args.EmblemCount = townInfoData.EmblemCount;
    return handlers.ClearDungeon(args);
};
handlers.ClearDungeon = function (args) {
    //town1_chaotic
    //house_alignment
    //gold
    //currentPlayerId
    log.info("ClearDungeon " + currentPlayerId);
    var partyMembers = JSON.parse(args.CharacterIds);
    var mobs = args.Mobs;

    var totalExp = 0;
    var totalGold = 0;
    var totalAlignment = 0;
    var totalEmblem = range(1, args.EmblemCount);
    var items = ["Dagger_00"];
    for (var i = 0; i < mobs.length; i++) 
    {
        if (mobs[i].Name == "Wolf")
        {
            totalExp += 40 * mobs[i].Count;
            totalGold += 4 * mobs[i].Count;
            totalAlignment += 1 * mobs[i].Count;

            for (var k = 0; k < mobs[i].Count; k++)
            {
                var randomItem = server.EvaluateRandomResultTable(
                    {
                       "CatalogVersion": catalogVersion,
                       "PlayFabId": currentPlayerId,
                       "TableId": "WolfDropTable"
                    }
                );

                if (randomItem.ResultItemId != "Nothing") {
                    log.info("item " + JSON.stringify(randomItem));
                    items.push(randomItem.ResultItemId);
                }
            }
        }
        else if(mobs[i].Name == "SilverFang")
        {
            totalExp += 120 * mobs[i].Count;
            totalGold += 12 * mobs[i].Count;
            totalAlignment += 2 * mobs[i].Count;
        }
    }

    var realItem = server.GrantItemsToUser(
        {
            "CatalogVersion": catalogVersion,
            "PlayFabId": currentPlayerId,
            "ItemIds": items
        }
    );

    for (var i = 0; i < partyMembers.length; i++)
    {
        var charStat = server.GetCharacterStatistics(
            {
                "PlayFabId": currentPlayerId,
                "CharacterId": partyMembers[i]
            }
        );
        var previousExp = charStat.CharacterStatistics.AccumulatedXP;
        //fresh character
        if (previousExp == null)
        {
            previousExp = 0;
        }
        server.UpdateCharacterStatistics(
            {
                "PlayFabId": currentPlayerId,
                "CharacterId": partyMembers[i],
                "CharacterStatistics": {
                    "AccumulatedXP": previousExp + totalExp,
                }
            }
        );
        log.info("eachExp " + totalExp + " for " + partyMembers[i]);
    }

    server.AddUserVirtualCurrency(
        {
            "PlayFabId": currentPlayerId,
            "VirtualCurrency": "GD",
            "Amount": totalGold
        }
    );
    log.info("totalGold " + totalGold);

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
    //log.info("userData", JSON.stringify(userData));
    try {
        var headers = {
            "X-MyCustomHeader": "Some Value"
        };

        var body = {
            townId: args.TownId,
            userId: currentPlayerId,
            alignment: alignment,
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

    return {
        "TotalExp": totalExp,
        "TotalGold": totalGold,
        "TotalAlignment": totalAlignment,
        "TotalEmblem": totalEmblem,
        "Items": items
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
    else
    {
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
    
    if (itemToEnchant == null)
    {
        return { "Error": "Item Not Found" };
    }

    var enchantResult = 0;
    var prevEnchant = 0;
    var goldSubtractResult = null;
    goldSubtractResult = server.SubtractCharacterVirtualCurrency({
        "PlayFabId": currentPlayerId,
        "CharacterId": characterId,
        "VirtualCurrency": "GD",
        "Amount": enchantPriceInGold
    });

    var odd = Math.floor((Math.random() * 100) + 1);
    log.info("odd " + odd);
    if (odd < enchantBrokenChance) {
        log.info("item broken");
        var consumeItemResult = server.ConsumeItem({
            "PlayFabId": currentPlayerId,
            "ItemInstanceId": itemInstanceId,
            //"CharacterId": characterId,
            "ConsumeCount": 1
        });
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
    log.info("characterId " + characterId);
    log.info("items " + items.length);

    var catalogItems = server.GetCatalogItems({
        "CatalogVersion": catalogVersion
    });


    var gold = 0;

    for (var i = 0; i < catalogItems.Catalog.length; i++) {
        var item = catalogItems.Catalog[i];
        log.info("catalogItems " + item);
        for (var k = 0; k < items.length; k++) {
            var itemId = items[k].ItemId;
            var itemInstanceId = items[k].InstanceId;
            log.info("itemId " + itemId);
            log.info("itemInstanceId " + itemInstanceId);
            log.info("catalogItems itemId " + item.ItemId);
            if (item.ItemId == itemId)
            {
                var storePrice = parseInt(item.VirtualCurrencyPrices.GD);
                if (storePrice == 0)
                    storePrice = 1;//free item gets 1 gold price when resell...
                else
                    storePrice = storePrice / 2;
                gold += storePrice;
                log.info("gold " + gold);
                var consumeItemResult = server.ConsumeItem({
                    "PlayFabId": currentPlayerId,
                    "ItemInstanceId": itemInstanceId,
                    "CharacterId": characterId,
                    "ConsumeCount": 1
                });
                log.info("consumeItemResult " + consumeItemResult);
                break;
            }
        }
    }
    
    var goldGainResult = server.AddCharacterVirtualCurrency({
        "PlayFabId": currentPlayerId,
        "CharacterId": characterId,
        "VirtualCurrency": "GD",
        "Amount": gold
    });
   
    return { "GoldGainResult": goldGainResult, "ItemSoldResult": args.Items };
};

handlers.CloudSetTitleData = function (args) {
    log.info("PlayFabId " + currentPlayerId);
    log.info("Bias " + args.Bias);

    var bias = args.Bias;

    var serverTitleData = server.GetTitleData({"Keys": []});
    log.info("serverTitleData " + JSON.stringify(serverTitleData));

    var biasInInt = parseInt(serverTitleData.Data[bias]);
    log.info("Previous bias " + bias + " " + biasInInt);
    biasInInt += parseInt(args[bias]);
    log.info("args[bias] " + bias + " " + args[bias]);
    log.info("Current bias " + bias + " " + biasInInt);

    //server.LogEvent(args);

    return server.SetTitleData({
        "Key": bias,
        "Value": biasInInt.toString()
    });
};

handlers.CloudUpdateUserInventoryItemCustomData = function (args)
{
    log.info("PlayFabId " + args.PlayFabId);
    log.info("CharacterId " + args.CharacterId);
    log.info("ItemInstanceId " + args.ItemInstanceId);
    log.info("Data " + args.Data);
    log.info("KeysToRemove " + args.KeysToRemove);

    //var customData = JSON.parse(args.Data);
    //server.LogEvent(args);
    return server.UpdateUserInventoryItemCustomData({
        PlayFabId: currentPlayerId,
        CharacterId: args.CharacterId,
        ItemInstanceId: args.ItemInstanceId,
        Data: args.Data,
    });
};

// checks to see if an object has any properties
// Returns true for empty objects and false for non-empty objects
function isObjectEmpty(obj)
{
	if(typeof obj === 'undefined')
	{
		return true;
	}

	if(Object.getOwnPropertyNames(obj).length === 0)
	{
		return true;
	}
	else
	{
		return false;
	}
}

// creates a standard GUID string
function CreateGUID()
{
	//http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {var r = Math.random()*16|0,v=c=='x'?r:r&0x3|0x8;return v.toString(16);});
}