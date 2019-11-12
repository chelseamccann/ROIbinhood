import React from 'react';
import TickerIndexContainer from '../ticker/ticker_index_container';
import {ProtectedRoute} from '../../util/route_utils';
import PortfolioChart from './portfolio_chart'
import { fetchDailyPrices, fetchPrices } from '../../util/ticker_data_api_util';
import News from '../news/news';
import WatchlistContainer from '../watchlist/watchlist_container'

class Portfolio extends React.Component{
    constructor(props){
        super(props)
        this.state = { 
            "1D": [],
            "5dm": [],
            "1mm": [],
            "3M": [],
            "1Y": [],
            "5Y": [],
            // "ALL": [],
            fetched: false,
            timeFrame: "1D",
            tickerSymbol: "",
            openValue: null,
            closeValue: null,
            change: 0,
            changePercent: 0,

        }
        
        this.dailyPrices = {}
        this.weeklyPrices ={}
        this.updatePrices = this.updatePrices.bind(this);
        this.dailyVal = this.dailyVal.bind(this);
    }

    componentDidMount(){

        this.props.fetchTickers();
        this.props.fetchTransactions().then(response => {
            this.dailyVal(response) // DAILY PORTFOLIO CALC
        }) 
    }


    dailyVal(response){ // DAILY PORTFOLIO CALC
        let that = this;

        const data = response.transactions.forEach((asset, idx) => {
            if (this.props.tickers[asset.ticker_symbol.toUpperCase()]){
                const createdAt = new Date(Date.parse(`${asset.created_at}`))

                fetchDailyPrices(asset.ticker_symbol).then(prices => {
                    let num_shares = asset.purchase_shares
                    let currentDay = prices[0].date
                    let nullArr = []
                    prices.forEach((close_price, idx) => {
                        const date = new Date(Date.parse(`${close_price.date} ${close_price.minute}`))
                        if (idx === prices.length-1){
                            this.setState({lastIdx: idx})
                            let currentMinute = prices[prices.length-1].minute
                            let currentDate = new Date(Date.parse(`${currentDay} ${currentMinute}`))
                            let closeTime = "16:00"
                            let closeDate = new Date(Date.parse(`${currentDay} ${closeTime}`))
                            
                            while (currentDate < closeDate){
                                currentDate = new Date(currentDate.setMinutes(currentDate.getMinutes()+1))
                                // that.dailyPrices[currentDate.toLocaleTimeString([], {timeStyle: 'short'})] = null
                                nullArr.push({date: currentDate.toLocaleTimeString([], {timeStyle: 'short'}), value: null})
                            }
                        } else if(date > createdAt && close_price.close !== null){

                            if (that.dailyPrices[date.toLocaleTimeString([], {timeStyle: 'short'})] >= 0){
                                that.dailyPrices[date.toLocaleTimeString([], {timeStyle: 'short'})] += close_price.close * num_shares
                            } else {
                                that.dailyPrices[date.toLocaleTimeString([], {timeStyle: 'short'})] = (close_price.close * num_shares) + parseFloat(this.props.currentBuyingPower)
                            }
                        }
                    })

                    debugger
                    if(idx === response.transactions.length - 1){
                        let newArr = []
                        newArr = Object.keys(that.dailyPrices).map((key, idx) => {
                            // let d = new Date(currentDay + " " + key)
                            return {"date": key, "value": that.dailyPrices[key]}
                        })
                        // let arr = newArr.concat(nullArr)
                        debugger
                        that.setState({portfolioValue: newArr.concat(nullArr), oldArr: newArr, fetched: true})
                    }

                })
            }
        })
    }


    updatePrices(timeFrame){ // CLICKED TIMEFRAME CALC
        // this.setState({fetched: false})
        if (this.state.timeFrame !== timeFrame && timeFrame !== '1D'){ 
            
            this.weeklyPrices = {}
            let that = this;
                Object.values(this.props.transactions).forEach((asset, idx) => {

                    if (this.props.tickers[asset.ticker_symbol.toUpperCase()]){
                        const createdAt = new Date(Date.parse(`${asset.created_at}`))//.toLocaleString('en-US')

                        fetchPrices(asset.ticker_symbol, timeFrame).then(prices => {
                            let num_shares = asset.purchase_shares
                            prices.forEach(close_price => {
                                const date = close_price.minute ? new Date(Date.parse(`${close_price.date} ${close_price.minute}`)) : new Date(Date.parse(`${close_price.date}`))//.toLocaleString('en-US')

                                if(date > createdAt && close_price.close !== null){
                                    if (that.weeklyPrices[date.toLocaleString('en-US')] >= 0){
                                        that.weeklyPrices[date.toLocaleString('en-US')] += close_price.close * num_shares
                                    } else {
                                        that.weeklyPrices[date.toLocaleString('en-US')] = (close_price.close * num_shares) + parseFloat(this.props.currentBuyingPower)
                                    }
                                }
                            })

                            
                            if(idx === this.props.transactions.length - 1){
                                const newArr = Object.keys(that.weeklyPrices).map(key => {
                                    return {"date": key, "value": that.weeklyPrices[key]}
                                })

                                that.setState({portfolioValue: newArr, fetched: true})
                    
                            }
                        }).then(this.setState({timeFrame: timeFrame}))
                    }
            })
            
        } else if (this.state.timeFrame !== timeFrame && timeFrame === '1D'){
            
            this.props.fetchTransactions().then(response => {
                this.dailyVal(response)
            }).then(this.setState({timeFrame: timeFrame}))
        }

        
    }


    render(){
        

        const tF = Object.keys(this.state).map(key => {
            if (key==="1D" || key==="5dm" || key==="1mm" || key==="3M" || key==="1Y" || key==="ALL"){
                return <button className={`btns ${this.state.timeFrame === key ? 'active': ''}`} key={`${key}-id`} onClick={() => {this.updatePrices(key)}}>
                            {key.slice(0, 2).toUpperCase()}
                       </button>
            }
        })

        if(this.state.fetched){

            // let data = this.state.portfolioValue.slice()

            console.log(this.state.portfolioValue)
            console.log(this.state.oldArr)
            return (
                
                <>
                <div className="chart-and-news-wrap">
                    <div className="chart-wrap"> 

                        <PortfolioChart 
                        portfolioValue={this.state.portfolioValue}
                        oldArr={this.state.oldArr}
                        timeFrame={this.state.timeFrame}
                        lastIdx={this.state.lastIdx}
                        />
                        
                        <div className="time-frame-buttons">{tF}</div>
                    </div>
                
                </div>
                </>
                )
        } else { 
            return <div className="lds-spinner chart-load"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
        }
    }
}

export default Portfolio;    